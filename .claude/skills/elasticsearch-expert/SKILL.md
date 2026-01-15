---
name: elasticsearch-expert
description: |
  Elasticsearch 专家技能，适用于 RuoYi-Vue-Plus-Legal 项目中所有涉及 ES 的场景。
  当用户需要：设计 ES 索引、构建复杂查询（搜索/过滤/高亮/排序/聚合）、编写 ES 相关 Java 代码、
  诊断或优化 ES 性能、实现数据同步策略时，应使用此 skill。
  技术栈：Spring Data Elasticsearch 5.5.x + Elasticsearch 8.18.8 + IK 分词器。
---

# Elasticsearch Expert Skill

本 skill 提供 RuoYi-Vue-Plus-Legal 项目中 Elasticsearch 集成的完整指导。

## 技术栈

| 组件 | 版本 |
|------|------|
| Elasticsearch | 8.18.8 |
| Spring Data Elasticsearch | 5.5.x |
| Spring Boot | 3.5.x |
| 分词器 | IK（ik_max_word / ik_smart） |

## 项目架构

### 核心模块

- **公共封装**：`ruoyi-common/ruoyi-common-elasticsearch`
- **业务模块**：`ruoyi-modules/ruoyi-legal-search`

### 核心类

| 类 | 路径 | 用途 |
|---|------|------|
| `ElasticsearchTemplateWrapper` | `ruoyi-common-elasticsearch/core/` | ES 操作统一封装（save/get/delete/search） |
| `ElasticsearchUtils` | `ruoyi-common-elasticsearch/utils/` | 静态工具类（参照 RedisUtils 模式） |
| `ElasticsearchProperties` | `ruoyi-common-elasticsearch/config/properties/` | 配置属性（enabled/logQuery/slowQueryThreshold） |
| `ElasticsearchQueryLogAspect` | `ruoyi-common-elasticsearch/aspect/` | 查询日志 AOP 切面 |

### 配置示例

```yaml
spring:
  elasticsearch:
    uris: http://localhost:9200
    connection-timeout: 2s
    socket-timeout: 30s

ruoyi:
  elasticsearch:
    enabled: true
    index-prefix: dev_        # 环境隔离前缀
    log-query: true           # 开发环境开启查询日志
    slow-query-threshold: 500ms
```

## 工具类使用

### ElasticsearchUtils（推荐）

```java
// 保存文档
LegalRegulationDocument doc = new LegalRegulationDocument();
ElasticsearchUtils.save(doc);

// 按 ID 获取
LegalRegulationDocument result = ElasticsearchUtils.get("10001", LegalRegulationDocument.class);

// 删除
boolean deleted = ElasticsearchUtils.delete("10001", LegalRegulationDocument.class);

// 查询
SearchHits<LegalRegulationDocument> hits = ElasticsearchUtils.search(query, LegalRegulationDocument.class);

// 单条查询
Optional<LegalRegulationDocument> one = ElasticsearchUtils.searchOne(query, LegalRegulationDocument.class);

// 创建索引（如不存在）
ElasticsearchUtils.createIndexIfNotExists(LegalRegulationDocument.class);
```

### ElasticsearchTemplateWrapper（需注入）

```java
@RequiredArgsConstructor
public class SomeService {
    private final ElasticsearchTemplateWrapper esWrapper;

    public void doSearch() {
        SearchHits<MyDoc> hits = esWrapper.search(query, MyDoc.class);
    }
}
```

## 查询构建（核心）

### 标准查询模式

```java
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.query.HighlightQuery;
import org.springframework.data.elasticsearch.core.query.highlight.Highlight;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightField;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightParameters;
import co.elastic.clients.elasticsearch._types.query_dsl.*;
import co.elastic.clients.json.JsonData;

// 1. 构建 bool 查询
BoolQuery.Builder boolBuilder = new BoolQuery.Builder();

// 2. must: 关键词搜索（multi_match）
if (StringUtils.isNotBlank(keyword)) {
    boolBuilder.must(q -> q.multiMatch(mm -> mm
        .query(keyword)
        .fields("lawTitle^5", "lawContent^1", "formulatingAuthority^2", "docNumber^2", "tagsText^1.5", "citedText^1")
        .type(TextQueryType.BestFields)
    ));
}

// 3. filter: 精确过滤（不影响评分，可缓存）
if (StringUtils.isNotBlank(legalCharacter)) {
    boolBuilder.filter(q -> q.term(t -> t.field("legalCharacter").value(legalCharacter)));
}
if (CollUtil.isNotEmpty(districtCodes)) {
    boolBuilder.filter(q -> q.terms(t -> t.field("districtCodes").terms(tv -> tv.value(
        districtCodes.stream().map(FieldValue::of).toList()
    ))));
}
if (pubDateStart != null && pubDateEnd != null) {
    boolBuilder.filter(q -> q.range(r -> r.field("pubDate")
        .gte(JsonData.of(pubDateStart.toString()))
        .lte(JsonData.of(pubDateEnd.toString()))
    ));
}

// 4. 构建高亮
List<HighlightField> highlightFields = List.of(
    new HighlightField("lawTitle"),
    new HighlightField("lawContent", Map.of("fragment_size", 200, "number_of_fragments", 3)),
    new HighlightField("formulatingAuthority"),
    new HighlightField("docNumber"),
    new HighlightField("tagsText"),
    new HighlightField("citedText")
);
Highlight highlight = new Highlight(
    HighlightParameters.builder()
        .withPreTags("<em>")
        .withPostTags("</em>")
        .build(),
    highlightFields
);

// 5. 构建完整查询
NativeQuery query = NativeQuery.builder()
    .withQuery(q -> q.bool(boolBuilder.build()))
    .withHighlightQuery(new HighlightQuery(highlight, null))
    .withSort(Sort.by(Sort.Order.desc("_score"), Sort.Order.desc("pubDate"), Sort.Order.desc("groupId")))
    .withPageable(PageRequest.of(pageNum - 1, pageSize))
    .build();

// 6. 执行查询
SearchHits<LegalRegulationDocument> hits = ElasticsearchUtils.search(query, LegalRegulationDocument.class);
```

### 聚合统计（Facets）

```java
import co.elastic.clients.elasticsearch._types.aggregations.*;

// 构建聚合查询
NativeQuery aggQuery = NativeQuery.builder()
    .withQuery(q -> q.bool(boolBuilder.build()))
    .withAggregation("legalCharacter", Aggregation.of(a -> a.terms(t -> t.field("legalCharacter").size(20))))
    .withAggregation("lawStatus", Aggregation.of(a -> a.terms(t -> t.field("lawStatus").size(10))))
    .withAggregation("pubYear", Aggregation.of(a -> a.dateHistogram(dh -> dh
        .field("pubDate")
        .calendarInterval(CalendarInterval.Year)
        .format("yyyy")
    )))
    .withAggregation("districtCodes", Aggregation.of(a -> a.terms(t -> t.field("districtCodes").size(50))))
    .withAggregation("tags", Aggregation.of(a -> a.terms(t -> t.field("tags").size(30))))
    .withAggregation("formulatingAuthorityTop", Aggregation.of(a -> a.terms(t -> t.field("formulatingAuthority.keyword").size(10))))
    .withMaxResults(0) // 只要聚合，不要文档
    .build();

SearchHits<LegalRegulationDocument> aggHits = ElasticsearchUtils.search(aggQuery, LegalRegulationDocument.class);

// 解析聚合结果
ElasticsearchAggregations aggs = (ElasticsearchAggregations) aggHits.getAggregations();
Map<String, Aggregate> aggMap = aggs.aggregations();
// ... 按需解析各维度统计
```

## 索引设计规范

### Document 类示例

```java
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.*;

@Document(indexName = "#{@elasticsearchProperties.indexPrefix}legal_regulation_current")
@Setting(settingPath = "elasticsearch/legal-regulation-settings.json")
public class LegalRegulationDocument {

    @Id
    private Long groupId;

    // 文本字段（IK 分词，支持高亮）
    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart")
    private String lawTitle;

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart",
           termVector = TermVector.with_positions_offsets) // 长文本开启 term_vector
    private String lawContent;

    // Keyword 字段（精确匹配/聚合）
    @Field(type = FieldType.Keyword)
    private String legalCharacter;

    @Field(type = FieldType.Keyword)
    private String lawStatus;

    // 多值 Keyword
    @Field(type = FieldType.Keyword)
    private List<String> districtCodes;

    @Field(type = FieldType.Keyword)
    private List<String> tags;

    // 日期字段
    @Field(type = FieldType.Date, format = DateFormat.date)
    private LocalDate pubDate;

    // 排序字段
    @Field(type = FieldType.Integer)
    private Integer legalCharacterOrder;

    // Multi-field（text + keyword）
    @MultiField(
        mainField = @Field(type = FieldType.Text, analyzer = "ik_max_word"),
        otherFields = @InnerField(suffix = "keyword", type = FieldType.Keyword)
    )
    private String formulatingAuthority;
}
```

### 字段类型选择

| 需求 | 字段类型 | 说明 |
|------|---------|------|
| 全文检索 + 高亮 | `text` + IK | 使用 `ik_max_word` 索引，`ik_smart` 搜索 |
| 精确过滤 / 聚合 | `keyword` | 不分词，支持 term/terms 查询 |
| 既检索又聚合 | `multi-field` | text 主字段 + .keyword 子字段 |
| 日期范围 | `date` | 支持 range 查询和 date_histogram 聚合 |
| 排序数值 | `integer` | 预计算排序值，避免运行时计算 |
| 长文本高亮 | `text` + `term_vector` | 开启 `with_positions_offsets` 提升高亮稳定性 |

## 数据同步策略

### 写路径设计

```
业务写 PG → 记录脏数据 → 定时任务消费 → Bulk Upsert ES
```

### 脏数据队列（Redis Set）

```java
// 标记脏数据
RedisUtils.setCacheSet("legal:es:dirty:groupIds", groupId);

// 定时任务消费
@Scheduled(fixedDelay = 5000)
public void syncDirtyToEs() {
    Set<Long> dirtyIds = RedisUtils.getCacheSet("legal:es:dirty:groupIds");
    if (CollUtil.isEmpty(dirtyIds)) return;

    // 批量查询 PG
    List<LegalRegulationDocument> docs = buildDocuments(dirtyIds);

    // Bulk Upsert
    esWrapper.getOperations().save(docs);

    // 清除已处理
    RedisUtils.deleteObject("legal:es:dirty:groupIds");
}
```

### 索引重建流程

1. 创建新版本索引（如 `v2`），调整 `refresh_interval=-1`、`replicas=0`
2. 全量 bulk 写入
3. 恢复 `refresh_interval`、`replicas`
4. 校验（count/抽样对比）
5. Alias 切换：`v1` → `v2`

## 排序策略

| 场景 | 排序规则 |
|------|---------|
| 有关键词 | `_score desc` → `pubDate desc` → `groupId desc` |
| 无关键词 | `legalCharacterOrder asc` → `lawStatusOrder asc` → `pubDate desc` |

## 最佳实践

1. **filter 优于 must**：精确过滤条件放 `filter`，可缓存且不计算评分
2. **避免 wildcard/prefix**：前缀通配符查询性能差，尽量用 ngram 或 edge_ngram
3. **控制分页深度**：`from + size` 不超过 10000，深度分页用 `search_after`
4. **长文本高亮**：开启 `term_vector`，调整 `index.highlight.max_analyzed_offset`
5. **批量写入**：使用 bulk API，调大 `refresh_interval`，重建时 `replicas=0`
6. **alias 管理**：始终通过 alias 访问索引，便于无损切换

## 参考资源

详细的查询语法和 Java 示例，参见：

- `references/es-query-dsl.md` - 完整的 Query DSL 参考
- `references/es-java-patterns.md` - Java 代码模式与示例
- `references/es-index-design.md` - 索引设计详细规范

项目文档：

- `docs/elasticsearch-query-guide.md` - ES 查询指南
- `docs/legal_search/Elasticsearch集成方案.md` - 完整集成方案
