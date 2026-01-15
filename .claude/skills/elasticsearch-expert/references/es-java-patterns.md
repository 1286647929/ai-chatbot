# Elasticsearch Java 代码模式与示例

> Spring Data Elasticsearch 5.5.x + Elasticsearch Java Client 8.x

## 1. 依赖与导入

### 1.1 Maven 依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>
```

### 1.2 核心导入

```java
// Spring Data Elasticsearch
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.HighlightQuery;
import org.springframework.data.elasticsearch.core.query.highlight.Highlight;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightField;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightParameters;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations;

// Elasticsearch Java Client
import co.elastic.clients.elasticsearch._types.query_dsl.*;
import co.elastic.clients.elasticsearch._types.aggregations.*;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.json.JsonData;

// Spring Data
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

// 项目工具类
import org.dromara.common.elasticsearch.utils.ElasticsearchUtils;
```

---

## 2. 查询构建模式

### 2.1 完整的搜索查询（搜索 + 过滤 + 高亮 + 排序 + 分页）

```java
public SearchHits<LegalRegulationDocument> search(LegalRegulationSearchBo bo) {
    // 1. 构建 bool 查询
    BoolQuery.Builder boolBuilder = new BoolQuery.Builder();

    // 2. must: 关键词搜索
    if (StringUtils.isNotBlank(bo.getKeyword())) {
        boolBuilder.must(q -> q.multiMatch(mm -> mm
            .query(bo.getKeyword())
            .fields("lawTitle^5", "lawContent^1", "formulatingAuthority^2",
                    "docNumber^2", "tagsText^1.5", "citedText^1")
            .type(TextQueryType.BestFields)
        ));
    }

    // 3. filter: 精确过滤条件
    addFilters(boolBuilder, bo);

    // 4. 构建高亮
    Highlight highlight = buildHighlight();

    // 5. 构建排序
    Sort sort = buildSort(bo);

    // 6. 构建完整查询
    NativeQuery query = NativeQuery.builder()
        .withQuery(q -> q.bool(boolBuilder.build()))
        .withHighlightQuery(new HighlightQuery(highlight, null))
        .withSort(sort)
        .withPageable(PageRequest.of(bo.getPageNum() - 1, bo.getPageSize()))
        .build();

    // 7. 执行查询
    return ElasticsearchUtils.search(query, LegalRegulationDocument.class);
}
```

### 2.2 过滤条件构建

```java
private void addFilters(BoolQuery.Builder boolBuilder, LegalRegulationSearchBo bo) {
    // term 精确匹配（单值）
    if (StringUtils.isNotBlank(bo.getLegalCharacter())) {
        boolBuilder.filter(q -> q.term(t -> t
            .field("legalCharacter")
            .value(bo.getLegalCharacter())
        ));
    }

    // terms 精确匹配（多值）
    if (CollUtil.isNotEmpty(bo.getLawStatusList())) {
        boolBuilder.filter(q -> q.terms(t -> t
            .field("lawStatus")
            .terms(tv -> tv.value(
                bo.getLawStatusList().stream()
                    .map(FieldValue::of)
                    .toList()
            ))
        ));
    }

    // terms 数组字段匹配
    if (CollUtil.isNotEmpty(bo.getDistrictCodes())) {
        boolBuilder.filter(q -> q.terms(t -> t
            .field("districtCodes")
            .terms(tv -> tv.value(
                bo.getDistrictCodes().stream()
                    .map(FieldValue::of)
                    .toList()
            ))
        ));
    }

    // range 日期范围
    if (bo.getPubDateStart() != null || bo.getPubDateEnd() != null) {
        boolBuilder.filter(q -> q.range(r -> {
            r.field("pubDate");
            if (bo.getPubDateStart() != null) {
                r.gte(JsonData.of(bo.getPubDateStart().toString()));
            }
            if (bo.getPubDateEnd() != null) {
                r.lte(JsonData.of(bo.getPubDateEnd().toString()));
            }
            return r;
        }));
    }

    // 引用筛选（法规级）
    if (bo.getCitedGroupId() != null) {
        boolBuilder.filter(q -> q.term(t -> t
            .field("citedGroupIds")
            .value(bo.getCitedGroupId())
        ));
    }

    // 引用筛选（条文级）
    if (bo.getCitedGroupId() != null && StringUtils.isNotBlank(bo.getCitedArticleNo())) {
        String articleKey = bo.getCitedGroupId() + "|" + bo.getCitedArticleNo();
        boolBuilder.filter(q -> q.term(t -> t
            .field("citedArticleKeys")
            .value(articleKey)
        ));
    }
}
```

### 2.3 高亮构建

```java
private Highlight buildHighlight() {
    List<HighlightField> highlightFields = List.of(
        new HighlightField("lawTitle"),
        new HighlightField("lawContent", Map.of(
            "fragment_size", 200,
            "number_of_fragments", 3
        )),
        new HighlightField("formulatingAuthority"),
        new HighlightField("docNumber"),
        new HighlightField("tagsText"),
        new HighlightField("citedText")
    );

    return new Highlight(
        HighlightParameters.builder()
            .withPreTags("<em>")
            .withPostTags("</em>")
            .build(),
        highlightFields
    );
}
```

### 2.4 排序构建

```java
private Sort buildSort(LegalRegulationSearchBo bo) {
    // 有关键词：相关度优先
    if (StringUtils.isNotBlank(bo.getKeyword())) {
        return Sort.by(
            Sort.Order.desc("_score"),
            Sort.Order.desc("pubDate"),
            Sort.Order.desc("groupId")
        );
    }

    // 无关键词：业务默认排序
    return Sort.by(
        Sort.Order.asc("legalCharacterOrder"),
        Sort.Order.asc("lawStatusOrder"),
        Sort.Order.desc("pubDate")
    );
}
```

---

## 3. 聚合查询模式

### 3.1 分面统计（Facets）

```java
public Map<String, List<FacetBucket>> getFacets(LegalRegulationSearchBo bo) {
    // 1. 构建与列表查询相同的过滤条件
    BoolQuery.Builder boolBuilder = new BoolQuery.Builder();
    addFilters(boolBuilder, bo);

    // 关键词也纳入过滤（影响聚合结果）
    if (StringUtils.isNotBlank(bo.getKeyword())) {
        boolBuilder.must(q -> q.multiMatch(mm -> mm
            .query(bo.getKeyword())
            .fields("lawTitle^5", "lawContent^1")
            .type(TextQueryType.BestFields)
        ));
    }

    // 2. 构建聚合查询
    NativeQuery aggQuery = NativeQuery.builder()
        .withQuery(q -> q.bool(boolBuilder.build()))
        .withAggregation("legalCharacter",
            Aggregation.of(a -> a.terms(t -> t.field("legalCharacter").size(20))))
        .withAggregation("lawStatus",
            Aggregation.of(a -> a.terms(t -> t.field("lawStatus").size(10))))
        .withAggregation("pubYear",
            Aggregation.of(a -> a.dateHistogram(dh -> dh
                .field("pubDate")
                .calendarInterval(CalendarInterval.Year)
                .format("yyyy")
            )))
        .withAggregation("districtCodes",
            Aggregation.of(a -> a.terms(t -> t.field("districtCodes").size(50))))
        .withAggregation("tags",
            Aggregation.of(a -> a.terms(t -> t.field("tags").size(30))))
        .withAggregation("formulatingAuthorityTop",
            Aggregation.of(a -> a.terms(t -> t.field("formulatingAuthority.keyword").size(10))))
        .withMaxResults(0) // 只要聚合，不要文档
        .build();

    // 3. 执行查询
    SearchHits<LegalRegulationDocument> hits =
        ElasticsearchUtils.search(aggQuery, LegalRegulationDocument.class);

    // 4. 解析聚合结果
    return parseAggregations(hits);
}

private Map<String, List<FacetBucket>> parseAggregations(SearchHits<?> hits) {
    Map<String, List<FacetBucket>> result = new HashMap<>();

    if (hits.getAggregations() == null) {
        return result;
    }

    ElasticsearchAggregations aggs = (ElasticsearchAggregations) hits.getAggregations();
    Map<String, Aggregate> aggMap = aggs.aggregations();

    // 解析 terms 聚合
    for (String aggName : List.of("legalCharacter", "lawStatus", "districtCodes", "tags", "formulatingAuthorityTop")) {
        if (aggMap.containsKey(aggName)) {
            result.put(aggName, parseTermsAgg(aggMap.get(aggName)));
        }
    }

    // 解析 date_histogram 聚合
    if (aggMap.containsKey("pubYear")) {
        result.put("pubYear", parseDateHistogramAgg(aggMap.get("pubYear")));
    }

    return result;
}

private List<FacetBucket> parseTermsAgg(Aggregate agg) {
    return agg.sterms().buckets().array().stream()
        .map(b -> new FacetBucket(b.key().stringValue(), b.docCount()))
        .toList();
}

private List<FacetBucket> parseDateHistogramAgg(Aggregate agg) {
    return agg.dateHistogram().buckets().array().stream()
        .map(b -> new FacetBucket(b.keyAsString(), b.docCount()))
        .toList();
}

@Data
@AllArgsConstructor
public static class FacetBucket {
    private String key;
    private long docCount;
}
```

---

## 4. 结果处理模式

### 4.1 SearchHits 处理

```java
public TableDataInfo<LegalRegulationVo> convertToTableData(
        SearchHits<LegalRegulationDocument> hits, int pageNum, int pageSize) {

    List<LegalRegulationVo> rows = hits.getSearchHits().stream()
        .map(this::convertToVo)
        .toList();

    return TableDataInfo.build(rows, hits.getTotalHits(), pageNum, pageSize);
}

private LegalRegulationVo convertToVo(SearchHit<LegalRegulationDocument> hit) {
    LegalRegulationDocument doc = hit.getContent();
    LegalRegulationVo vo = new LegalRegulationVo();

    // 基本字段映射
    vo.setGroupId(doc.getGroupId());
    vo.setLawTitle(doc.getLawTitle());
    vo.setFormulatingAuthority(doc.getFormulatingAuthority());
    vo.setPubDate(doc.getPubDate());
    // ... 其他字段

    // 高亮字段处理
    Map<String, List<String>> highlightFields = hit.getHighlightFields();

    if (highlightFields.containsKey("lawTitle")) {
        vo.setLawTitleHighlight(highlightFields.get("lawTitle").get(0));
    }
    if (highlightFields.containsKey("formulatingAuthority")) {
        vo.setFormulatingAuthorityHighlight(highlightFields.get("formulatingAuthority").get(0));
    }
    if (highlightFields.containsKey("lawContent")) {
        vo.setContentHighlights(highlightFields.get("lawContent"));
    }

    return vo;
}
```

### 4.2 单条查询

```java
public Optional<LegalRegulationDocument> getById(Long groupId) {
    NativeQuery query = NativeQuery.builder()
        .withQuery(q -> q.term(t -> t.field("groupId").value(groupId)))
        .build();

    return ElasticsearchUtils.searchOne(query, LegalRegulationDocument.class);
}
```

---

## 5. 索引管理模式

### 5.1 Document 类定义

```java
@Document(indexName = "#{@elasticsearchProperties.indexPrefix}legal_regulation_current")
@Setting(settingPath = "elasticsearch/legal-regulation-settings.json")
@Mapping(mappingPath = "elasticsearch/legal-regulation-mapping.json")
public class LegalRegulationDocument {

    @Id
    private Long groupId;

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart")
    private String lawTitle;

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart",
           termVector = TermVector.with_positions_offsets)
    private String lawContent;

    @Field(type = FieldType.Keyword)
    private String legalCharacter;

    @Field(type = FieldType.Integer)
    private Integer legalCharacterOrder;

    @Field(type = FieldType.Keyword)
    private String lawStatus;

    @Field(type = FieldType.Integer)
    private Integer lawStatusOrder;

    @MultiField(
        mainField = @Field(type = FieldType.Text, analyzer = "ik_max_word"),
        otherFields = @InnerField(suffix = "keyword", type = FieldType.Keyword)
    )
    private String formulatingAuthority;

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart")
    private String docNumber;

    @Field(type = FieldType.Date, format = DateFormat.date)
    private LocalDate pubDate;

    @Field(type = FieldType.Date, format = DateFormat.date)
    private LocalDate effectDate;

    @Field(type = FieldType.Keyword)
    private List<String> districtCodes;

    @Field(type = FieldType.Keyword)
    private List<String> tags;

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart")
    private String tagsText;

    @Field(type = FieldType.Long)
    private List<Long> citedGroupIds;

    @Field(type = FieldType.Keyword)
    private List<String> citedArticleKeys;

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart")
    private String citedText;
}
```

### 5.2 索引初始化

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class LegalSearchIndexInitializer implements ApplicationRunner {

    private final ObjectProvider<ElasticsearchTemplateWrapper> esWrapperProvider;

    @Override
    public void run(ApplicationArguments args) {
        ElasticsearchTemplateWrapper esWrapper = esWrapperProvider.getIfAvailable();
        if (esWrapper == null) {
            log.info("ES 未启用，跳过索引初始化");
            return;
        }

        try {
            boolean created = esWrapper.createIndexIfNotExists(LegalRegulationDocument.class);
            if (created) {
                log.info("ES 索引 legal_regulation_current 创建成功");
            } else {
                log.info("ES 索引 legal_regulation_current 已存在");
            }
        } catch (Exception e) {
            log.error("ES 索引初始化失败", e);
        }
    }
}
```

---

## 6. 数据同步模式

### 6.1 标记脏数据

```java
@Service
@RequiredArgsConstructor
public class LegalRegulationSyncService {

    private static final String DIRTY_KEY = "legal:es:dirty:groupIds";

    /**
     * 标记需要同步的法规组
     */
    public void markDirty(Long groupId) {
        RedisUtils.setCacheSet(DIRTY_KEY, groupId);
    }

    /**
     * 批量标记
     */
    public void markDirty(Collection<Long> groupIds) {
        if (CollUtil.isEmpty(groupIds)) return;
        groupIds.forEach(id -> RedisUtils.setCacheSet(DIRTY_KEY, id));
    }
}
```

### 6.2 定时同步任务

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class LegalEsSyncJob {

    private static final String DIRTY_KEY = "legal:es:dirty:groupIds";
    private static final int BATCH_SIZE = 100;

    private final ElasticsearchTemplateWrapper esWrapper;
    private final LegalRegulationDocumentBuilder docBuilder;

    @Scheduled(fixedDelay = 5000)
    public void syncDirtyToEs() {
        Set<Long> dirtyIds = RedisUtils.getCacheSet(DIRTY_KEY);
        if (CollUtil.isEmpty(dirtyIds)) {
            return;
        }

        log.info("开始同步 {} 条脏数据到 ES", dirtyIds.size());

        // 分批处理
        List<Long> idList = new ArrayList<>(dirtyIds);
        List<List<Long>> batches = ListUtil.partition(idList, BATCH_SIZE);

        for (List<Long> batch : batches) {
            try {
                // 构建文档
                List<LegalRegulationDocument> docs = docBuilder.build(batch);

                // Bulk 写入
                esWrapper.getOperations().save(docs);

                log.debug("同步批次完成，数量: {}", docs.size());
            } catch (Exception e) {
                log.error("同步批次失败，groupIds: {}", batch, e);
            }
        }

        // 清除已处理
        RedisUtils.deleteObject(DIRTY_KEY);
        log.info("脏数据同步完成");
    }
}
```

### 6.3 文档构建器

```java
@Component
@RequiredArgsConstructor
public class LegalRegulationDocumentBuilder {

    private final LegalRegulationGroupMapper groupMapper;
    private final LegalRegulationContentMapper contentMapper;
    private final LegalRegulationArticleCitationMapper citationMapper;

    public List<LegalRegulationDocument> build(List<Long> groupIds) {
        // 批量查询基本信息
        Map<Long, LegalRegulationGroup> groupMap = groupMapper.selectBatchIds(groupIds)
            .stream()
            .collect(Collectors.toMap(LegalRegulationGroup::getGroupId, Function.identity()));

        // 批量查询内容
        Map<Long, String> contentMap = loadContents(groupIds);

        // 批量查询引用
        Map<Long, List<ArticleCitation>> citationMap = loadCitations(groupIds);

        // 组装文档
        return groupIds.stream()
            .filter(groupMap::containsKey)
            .map(groupId -> buildDocument(
                groupMap.get(groupId),
                contentMap.get(groupId),
                citationMap.getOrDefault(groupId, Collections.emptyList())
            ))
            .toList();
    }

    private LegalRegulationDocument buildDocument(
            LegalRegulationGroup group,
            String content,
            List<ArticleCitation> citations) {

        LegalRegulationDocument doc = new LegalRegulationDocument();
        doc.setGroupId(group.getGroupId());
        doc.setLawTitle(group.getCurrentLawTitle());
        doc.setLawContent(content);
        doc.setLegalCharacter(group.getCurrentLegalCharacter());
        doc.setLegalCharacterOrder(getLegalCharacterOrder(group.getCurrentLegalCharacter()));
        doc.setLawStatus(group.getCurrentLawStatus());
        doc.setLawStatusOrder(getLawStatusOrder(group.getCurrentLawStatus()));
        doc.setFormulatingAuthority(group.getCurrentFormulatingAuthority());
        doc.setDocNumber(group.getCurrentDocNumber());
        doc.setPubDate(group.getCurrentPubDate());
        doc.setEffectDate(group.getCurrentEffectDate());
        doc.setDistrictCodes(group.getCurrentDistrictCodes());
        doc.setTags(group.getCurrentTags());
        doc.setTagsText(String.join(" ", group.getCurrentTags()));

        // 引用处理
        if (CollUtil.isNotEmpty(citations)) {
            doc.setCitedGroupIds(citations.stream()
                .map(ArticleCitation::getDstGroupId)
                .distinct()
                .toList());
            doc.setCitedArticleKeys(citations.stream()
                .map(c -> c.getDstGroupId() + "|" + c.getDstArticleNo())
                .distinct()
                .toList());
            doc.setCitedText(citations.stream()
                .map(ArticleCitation::getCitedText)
                .filter(StringUtils::isNotBlank)
                .collect(Collectors.joining(" ")));
        }

        return doc;
    }
}
```

---

## 7. 常用工具方法

### 7.1 查询条件判空包装

```java
public class EsQueryHelper {

    /**
     * 添加 term 过滤（非空时）
     */
    public static void addTermFilter(BoolQuery.Builder builder, String field, String value) {
        if (StringUtils.isNotBlank(value)) {
            builder.filter(q -> q.term(t -> t.field(field).value(value)));
        }
    }

    /**
     * 添加 terms 过滤（非空时）
     */
    public static void addTermsFilter(BoolQuery.Builder builder, String field, List<String> values) {
        if (CollUtil.isNotEmpty(values)) {
            builder.filter(q -> q.terms(t -> t
                .field(field)
                .terms(tv -> tv.value(values.stream().map(FieldValue::of).toList()))
            ));
        }
    }

    /**
     * 添加日期范围过滤
     */
    public static void addDateRangeFilter(BoolQuery.Builder builder, String field,
                                          LocalDate start, LocalDate end) {
        if (start != null || end != null) {
            builder.filter(q -> q.range(r -> {
                r.field(field);
                if (start != null) r.gte(JsonData.of(start.toString()));
                if (end != null) r.lte(JsonData.of(end.toString()));
                return r;
            }));
        }
    }
}
```

### 7.2 高亮结果提取

```java
public class EsHighlightHelper {

    /**
     * 获取高亮字段值，如无高亮则返回原值
     */
    public static String getHighlightOrOriginal(SearchHit<?> hit, String field, String original) {
        Map<String, List<String>> highlights = hit.getHighlightFields();
        if (highlights.containsKey(field) && CollUtil.isNotEmpty(highlights.get(field))) {
            return highlights.get(field).get(0);
        }
        return original;
    }

    /**
     * 获取多个高亮片段
     */
    public static List<String> getHighlightFragments(SearchHit<?> hit, String field) {
        Map<String, List<String>> highlights = hit.getHighlightFields();
        return highlights.getOrDefault(field, Collections.emptyList());
    }
}
```
