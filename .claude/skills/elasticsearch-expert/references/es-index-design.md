# Elasticsearch 索引设计规范

> 适用于 RuoYi-Vue-Plus-Legal 项目的索引设计指南

## 1. 索引命名规范

### 1.1 命名格式

```
{prefix}{domain}_{scope}_v{version}
```

- **prefix**：环境前缀，由 `ruoyi.elasticsearch.index-prefix` 配置（如 `dev_`、`prod_`）
- **domain**：业务域（如 `legal`）
- **scope**：数据范围（如 `regulation_current`、`case`、`citation_edge`）
- **version**：版本号（如 `v1`、`v2`）

### 1.2 示例

| 索引名 | 说明 |
|--------|------|
| `dev_legal_regulation_current_v1` | 开发环境 - 法规当前版本 - 版本1 |
| `prod_legal_case_v1` | 生产环境 - 案例 - 版本1 |

### 1.3 Alias 规范

始终通过 alias 访问索引，便于无损切换：

```
{prefix}{domain}_{scope}  →  {prefix}{domain}_{scope}_v{n}
```

示例：
- `dev_legal_regulation_current` → `dev_legal_regulation_current_v1`

---

## 2. 字段设计规范

### 2.1 字段类型选择矩阵

| 业务需求 | ES 字段类型 | 分词器 | 支持操作 |
|----------|------------|--------|----------|
| 全文检索 + 高亮 | `text` | `ik_max_word` / `ik_smart` | match, multi_match, highlight |
| 精确过滤 | `keyword` | 无 | term, terms, exists |
| 聚合统计 | `keyword` | 无 | terms agg, cardinality |
| 既检索又聚合 | `multi-field` | text + keyword | 两者皆可 |
| 日期范围 | `date` | 无 | range, date_histogram |
| 数值范围 | `integer` / `long` / `double` | 无 | range, avg, sum |
| 排序字段 | `keyword` / `integer` | 无 | sort |
| 多值字段 | `keyword[]` / `text[]` | 同上 | terms |

### 2.2 字段命名规范

- 使用 **camelCase**（如 `lawTitle`、`pubDate`）
- 关联 ID 字段加 `Id` 后缀（如 `groupId`、`regulationId`）
- 多值字段使用复数（如 `tags`、`districtCodes`）
- 排序字段加 `Order` 后缀（如 `legalCharacterOrder`）
- 高亮专用文本字段加 `Text` 后缀（如 `tagsText`、`citedText`）

### 2.3 Multi-field 设计

当字段需要同时支持全文检索和聚合时：

```json
{
  "formulatingAuthority": {
    "type": "text",
    "analyzer": "ik_max_word",
    "search_analyzer": "ik_smart",
    "fields": {
      "keyword": {
        "type": "keyword",
        "ignore_above": 256
      }
    }
  }
}
```

Java 注解：

```java
@MultiField(
    mainField = @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart"),
    otherFields = @InnerField(suffix = "keyword", type = FieldType.Keyword)
)
private String formulatingAuthority;
```

使用：
- 全文检索：`formulatingAuthority`
- 精确聚合：`formulatingAuthority.keyword`

---

## 3. 分析器配置

### 3.1 IK 分词器

项目使用 IK 中文分词器：

| 分词器 | 用途 | 特点 |
|--------|------|------|
| `ik_max_word` | 索引时 | 最细粒度切分，覆盖更多词条 |
| `ik_smart` | 搜索时 | 最粗粒度切分，精准匹配 |

### 3.2 Settings 配置示例

```json
{
  "settings": {
    "index": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "refresh_interval": "1s",
      "max_result_window": 10000,
      "highlight": {
        "max_analyzed_offset": 1000000
      }
    },
    "analysis": {
      "filter": {
        "legal_synonym": {
          "type": "synonym_graph",
          "synonyms_set": "legal-regulation-synonyms",
          "updateable": true
        }
      },
      "analyzer": {
        "ik_smart_synonym": {
          "type": "custom",
          "tokenizer": "ik_smart",
          "filter": ["legal_synonym"]
        }
      }
    }
  }
}
```

### 3.3 同义词管理

使用 ES Synonyms API 管理同义词：

```bash
# 创建同义词集
PUT /_synonyms/legal-regulation-synonyms
{
  "synonyms_set": [
    {
      "id": "law-alias",
      "synonyms": "法律, 法规, 法令"
    },
    {
      "id": "contract-alias",
      "synonyms": "合同, 契约, 协议"
    }
  ]
}

# 更新后重载分析器
POST /legal_regulation_current/_reload_search_analyzers
```

---

## 4. Mapping 设计

### 4.1 法规当前版本索引 Mapping

```json
{
  "mappings": {
    "properties": {
      "groupId": {
        "type": "long"
      },
      "lawTitle": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "lawContent": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart",
        "term_vector": "with_positions_offsets"
      },
      "legalCharacter": {
        "type": "keyword"
      },
      "legalCharacterOrder": {
        "type": "integer"
      },
      "lawStatus": {
        "type": "keyword"
      },
      "lawStatusOrder": {
        "type": "integer"
      },
      "formulatingAuthority": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart",
        "fields": {
          "keyword": {
            "type": "keyword",
            "ignore_above": 256
          }
        }
      },
      "docNumber": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart",
        "fields": {
          "keyword": {
            "type": "keyword",
            "ignore_above": 256
          }
        }
      },
      "pubDate": {
        "type": "date",
        "format": "yyyy-MM-dd||epoch_millis"
      },
      "effectDate": {
        "type": "date",
        "format": "yyyy-MM-dd||epoch_millis"
      },
      "districtCodes": {
        "type": "keyword"
      },
      "tags": {
        "type": "keyword"
      },
      "tagsText": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "citedGroupIds": {
        "type": "long"
      },
      "citedArticleKeys": {
        "type": "keyword"
      },
      "citedText": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      }
    }
  }
}
```

### 4.2 字段说明

| 字段 | 类型 | 说明 | 查询方式 | 聚合 |
|------|------|------|----------|------|
| `groupId` | long | 法规组 ID（_id） | term | ❌ |
| `lawTitle` | text | 法规标题 | match/multi_match | ❌ |
| `lawContent` | text | 全文内容 | multi_match | ❌ |
| `legalCharacter` | keyword | 位阶/文种 | term/terms | ✅ |
| `legalCharacterOrder` | integer | 位阶排序值 | sort | ❌ |
| `lawStatus` | keyword | 时效状态 | term/terms | ✅ |
| `lawStatusOrder` | integer | 时效排序值 | sort | ❌ |
| `formulatingAuthority` | text + keyword | 发文机关 | match / terms | ✅(.keyword) |
| `docNumber` | text + keyword | 文号 | match / term | ✅(.keyword) |
| `pubDate` | date | 发文日期 | range | ✅(date_histogram) |
| `effectDate` | date | 施行日期 | range | ✅(date_histogram) |
| `districtCodes` | keyword[] | 地域代码 | terms | ✅ |
| `tags` | keyword[] | 标签 | terms | ✅ |
| `tagsText` | text | 标签文本（高亮用） | match | ❌ |
| `citedGroupIds` | long[] | 引用法规 ID | terms | ✅(cardinality) |
| `citedArticleKeys` | keyword[] | 引用条文 Key | term | ✅ |
| `citedText` | text | 引用文本（高亮用） | match | ❌ |

---

## 5. 索引生命周期

### 5.1 创建新版本索引

```bash
# 1. 创建新索引（优化写入性能）
PUT /dev_legal_regulation_current_v2
{
  "settings": {
    "refresh_interval": "-1",
    "number_of_replicas": 0
  },
  "mappings": { ... }
}

# 2. 全量写入数据（bulk API）

# 3. 恢复正常设置
PUT /dev_legal_regulation_current_v2/_settings
{
  "refresh_interval": "1s",
  "number_of_replicas": 1
}

# 4. 强制刷新
POST /dev_legal_regulation_current_v2/_refresh
```

### 5.2 Alias 切换

```bash
# 原子切换：移除旧索引、添加新索引
POST /_aliases
{
  "actions": [
    { "remove": { "index": "dev_legal_regulation_current_v1", "alias": "dev_legal_regulation_current" } },
    { "add": { "index": "dev_legal_regulation_current_v2", "alias": "dev_legal_regulation_current" } }
  ]
}
```

### 5.3 删除旧索引

```bash
# 确认新索引正常后删除旧索引
DELETE /dev_legal_regulation_current_v1
```

---

## 6. 性能优化

### 6.1 索引优化

| 优化项 | 建议 | 说明 |
|--------|------|------|
| 分片数 | 3-5 | 根据数据量调整，单分片建议 10-50GB |
| 副本数 | 1（生产） | 重建时可设为 0 |
| refresh_interval | 1s（查询）/ -1（写入） | 批量写入时关闭 |
| max_result_window | 10000 | 深度分页用 search_after |

### 6.2 Mapping 优化

- **长文本**：开启 `term_vector: with_positions_offsets` 提升高亮性能
- **不需要检索的字段**：设置 `index: false`
- **不需要评分的字段**：设置 `norms: false`
- **不需要聚合的 keyword**：设置 `doc_values: false`

### 6.3 查询优化

- **filter 优于 must**：filter 可缓存，不计算评分
- **避免 wildcard 前缀**：`*keyword` 性能极差
- **限制返回字段**：使用 `_source` 过滤
- **合理设置聚合 size**：避免返回过多桶

---

## 7. 运维操作

### 7.1 常用诊断命令

```bash
# 查看索引信息
GET /legal_regulation_current/_settings
GET /legal_regulation_current/_mapping
GET /legal_regulation_current/_stats

# 查看文档数
GET /legal_regulation_current/_count

# 查看分片状态
GET /_cat/shards/legal_regulation_current?v

# 查看索引健康
GET /_cluster/health/legal_regulation_current
```

### 7.2 测试分词

```bash
GET /legal_regulation_current/_analyze
{
  "field": "lawTitle",
  "text": "中华人民共和国劳动合同法"
}
```

### 7.3 索引数据校验

```bash
# 对比 PG 与 ES 文档数
# PG: SELECT COUNT(*) FROM legal_regulation_group;
# ES:
GET /legal_regulation_current/_count
{
  "query": { "match_all": {} }
}

# 抽样对比（按 groupId 抽取）
GET /legal_regulation_current/_search
{
  "query": { "terms": { "groupId": [1001, 1002, 1003] } },
  "_source": ["groupId", "lawTitle", "pubDate"]
}
```
