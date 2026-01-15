# Elasticsearch Query DSL 完整参考

> 基于项目 legal_regulation_current 索引的实战指南

## 1. 基础查询类型

### 1.1 match_all（全部匹配）

```json
GET /legal_regulation_current/_search
{
  "query": { "match_all": {} },
  "size": 10
}
```

### 1.2 term（精确匹配）

用于 keyword 类型字段：

```json
GET /legal_regulation_current/_search
{
  "query": {
    "term": { "legalCharacter": "law" }
  }
}
```

多值匹配（terms）：

```json
{
  "query": {
    "terms": { "lawStatus": ["valid", "modified"] }
  }
}
```

### 1.3 match（全文检索）

用于 text 类型字段：

```json
{
  "query": {
    "match": {
      "lawTitle": {
        "query": "劳动合同",
        "operator": "and",           // 所有词都必须匹配
        "minimum_should_match": "75%" // 至少匹配 75%
      }
    }
  }
}
```

### 1.4 match_phrase（短语匹配）

要求词条按顺序连续出现：

```json
{
  "query": {
    "match_phrase": {
      "lawTitle": {
        "query": "劳动合同",
        "slop": 2  // 允许中间间隔 2 个词
      }
    }
  }
}
```

### 1.5 multi_match（多字段搜索）

```json
{
  "query": {
    "multi_match": {
      "query": "劳动争议",
      "fields": ["lawTitle^5", "lawContent^1", "formulatingAuthority^2", "docNumber^2"],
      "type": "best_fields"  // 取最高分字段
    }
  }
}
```

**type 类型说明**：

| type | 说明 | 适用场景 |
|------|------|----------|
| `best_fields` | 取最高分字段（默认） | 搜索词应完整出现在某个字段 |
| `most_fields` | 所有字段得分求和 | 同一内容存储在多个字段 |
| `cross_fields` | 将所有字段视为一个大字段 | 人名分散在多个字段 |
| `phrase` | 在每个字段上执行 match_phrase | 需要短语匹配 |

### 1.6 range（范围查询）

```json
{
  "query": {
    "range": {
      "pubDate": {
        "gte": "2024-01-01",
        "lte": "2024-12-31",
        "format": "yyyy-MM-dd"
      }
    }
  }
}
```

操作符：`gt`（大于）、`gte`（大于等于）、`lt`（小于）、`lte`（小于等于）

### 1.7 exists（存在性查询）

```json
{
  "query": {
    "exists": { "field": "effectDate" }
  }
}
```

### 1.8 prefix / wildcard（前缀/通配符）

```json
// 前缀查询
{ "query": { "prefix": { "docNumber.keyword": "国发" } } }

// 通配符查询（慎用，性能差）
{ "query": { "wildcard": { "docNumber.keyword": "*2024*" } } }
```

> **性能警告**：wildcard 和 prefix 查询可能导致全索引扫描，生产环境慎用！

---

## 2. 复合查询

### 2.1 bool 查询

```json
{
  "query": {
    "bool": {
      "must": [],       // 必须匹配，参与评分
      "should": [],     // 可选匹配，满足则加分
      "must_not": [],   // 必须不匹配
      "filter": []      // 必须匹配，不参与评分（可缓存）
    }
  }
}
```

**实战示例**：多条件筛选

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "劳动合同",
            "fields": ["lawTitle^5", "lawContent^1"]
          }
        }
      ],
      "filter": [
        { "term": { "legalCharacter": "law" } },
        { "terms": { "lawStatus": ["valid"] } },
        { "range": { "pubDate": { "gte": "2020-01-01" } } },
        { "terms": { "districtCodes": ["110000", "310000"] } }
      ]
    }
  }
}
```

### 2.2 must vs filter 区别

| 特性 | must | filter |
|------|------|--------|
| 是否必须匹配 | ✅ | ✅ |
| 是否影响评分 | ✅ 参与计算 _score | ❌ 不计算 |
| 是否使用缓存 | ❌ | ✅ 结果可缓存 |
| 适用场景 | 需要相关度排序 | 精确过滤条件 |

**最佳实践**：
- 需要评分/排序的条件放 `must`
- 精确过滤条件放 `filter`

### 2.3 should 的行为

```json
{
  "query": {
    "bool": {
      "must": [{ "match": { "lawTitle": "合同" } }],
      "should": [
        { "term": { "legalCharacter": { "value": "law", "boost": 2 } } },
        { "term": { "legalCharacter": { "value": "administrative_regulation", "boost": 1.5 } } }
      ],
      "minimum_should_match": 0  // 有 must 时，should 只影响评分
    }
  }
}
```

> 规则：当 bool 中没有 must 或 filter 时，should 至少需满足一个；否则 should 只影响评分。

---

## 3. 高亮（Highlight）

```json
{
  "query": {
    "multi_match": {
      "query": "劳动合同",
      "fields": ["lawTitle", "lawContent"]
    }
  },
  "highlight": {
    "pre_tags": ["<em>"],
    "post_tags": ["</em>"],
    "fields": {
      "lawTitle": {},
      "lawContent": {
        "fragment_size": 200,
        "number_of_fragments": 3
      },
      "formulatingAuthority": {},
      "docNumber": {},
      "tagsText": {},
      "citedText": {}
    }
  }
}
```

**高亮参数**：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `fragment_size` | 每个片段的最大字符数 | 100 |
| `number_of_fragments` | 返回的片段数 | 5 |
| `no_match_size` | 无匹配时返回的字符数 | 0 |
| `pre_tags` | 高亮前标签 | `<em>` |
| `post_tags` | 高亮后标签 | `</em>` |

---

## 4. 排序（Sort）

```json
{
  "query": { "match": { "lawTitle": "合同" } },
  "sort": [
    { "_score": { "order": "desc" } },
    { "pubDate": { "order": "desc" } },
    { "groupId": { "order": "desc" } }
  ]
}
```

**无关键词时的业务排序**：

```json
{
  "query": { "match_all": {} },
  "sort": [
    { "legalCharacterOrder": { "order": "asc" } },
    { "lawStatusOrder": { "order": "asc" } },
    { "pubDate": { "order": "desc" } }
  ]
}
```

---

## 5. 分页

### 5.1 基础分页（from + size）

```json
{
  "query": { "match_all": {} },
  "from": 0,    // 起始位置（0-based）
  "size": 10    // 每页数量
}
```

> **限制**：`from + size` 不能超过 10000（默认），深度分页性能差。

### 5.2 深度分页（search_after）

```json
// 第一次查询
{
  "query": { "match_all": {} },
  "size": 10,
  "sort": [
    { "pubDate": "desc" },
    { "groupId": "asc" }
  ]
}

// 后续查询，使用上一页最后一条的 sort 值
{
  "query": { "match_all": {} },
  "size": 10,
  "sort": [
    { "pubDate": "desc" },
    { "groupId": "asc" }
  ],
  "search_after": ["2024-06-15", 10001]
}
```

---

## 6. 聚合（Aggregations）

### 6.1 术语聚合（Terms）

```json
{
  "size": 0,
  "aggs": {
    "legalCharacter_dist": {
      "terms": { "field": "legalCharacter", "size": 20 }
    },
    "lawStatus_dist": {
      "terms": { "field": "lawStatus", "size": 10 }
    }
  }
}
```

### 6.2 日期直方图（Date Histogram）

```json
{
  "size": 0,
  "aggs": {
    "pubYear_dist": {
      "date_histogram": {
        "field": "pubDate",
        "calendar_interval": "year",
        "format": "yyyy"
      }
    }
  }
}
```

### 6.3 嵌套聚合

```json
{
  "size": 0,
  "aggs": {
    "by_legalCharacter": {
      "terms": { "field": "legalCharacter" },
      "aggs": {
        "by_status": {
          "terms": { "field": "lawStatus" }
        },
        "avg_articles": {
          "avg": { "field": "articleCount" }
        }
      }
    }
  }
}
```

### 6.4 基于查询条件的聚合

```json
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "legalCharacter": "law" } }
      ]
    }
  },
  "size": 0,
  "aggs": {
    "lawStatus_dist": {
      "terms": { "field": "lawStatus" }
    },
    "pubYear_dist": {
      "date_histogram": {
        "field": "pubDate",
        "calendar_interval": "year"
      }
    },
    "district_dist": {
      "terms": { "field": "districtCodes", "size": 50 }
    },
    "tags_dist": {
      "terms": { "field": "tags", "size": 30 }
    },
    "authority_top": {
      "terms": { "field": "formulatingAuthority.keyword", "size": 10 }
    }
  }
}
```

---

## 7. 评分调优（Function Score）

```json
{
  "query": {
    "function_score": {
      "query": {
        "multi_match": {
          "query": "劳动合同",
          "fields": ["lawTitle^5", "lawContent"]
        }
      },
      "functions": [
        {
          "filter": { "term": { "legalCharacter": "law" } },
          "weight": 2
        },
        {
          "gauss": {
            "pubDate": {
              "origin": "now",
              "scale": "365d",
              "decay": 0.5
            }
          }
        }
      ],
      "score_mode": "multiply",
      "boost_mode": "multiply"
    }
  }
}
```

---

## 8. 调试技巧

### 8.1 explain（评分解释）

```json
{
  "query": { "match": { "lawTitle": "劳动合同" } },
  "explain": true,
  "size": 3
}
```

### 8.2 profile（执行计划分析）

```json
{
  "profile": true,
  "query": {
    "bool": {
      "must": [{ "match": { "lawTitle": "合同" } }],
      "filter": [{ "term": { "legalCharacter": "law" } }]
    }
  }
}
```

### 8.3 测试分词效果

```json
GET /legal_regulation_current/_analyze
{
  "analyzer": "ik_smart",
  "text": "中华人民共和国劳动合同法"
}
```
