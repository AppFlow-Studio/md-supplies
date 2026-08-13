# Rendered text-contrast audit

Measured in a real browser against `http://localhost:3000` — computed colour vs EFFECTIVE
background (climbing ancestors past transparent), with the actual WCAG
thresholds applied: 4.5:1 normal text, 3:1 large text (>=24px, or >=18.66px
bold) and 3:1 non-text/icons.

Text nodes measured: **1094** across 13 routes.

## Classification

| Class | Nodes |
|---|---:|
| text-requiring-correction | 0 |
| already-compliant | 1080 |
| large-text | 0 |
| control-icon | 14 |
| decorative-non-text | 0 |

## Distinct failures requiring correction

_None._


## Note on coverage

Category, subcategory and industry GRIDS are not covered: the QA store has
no such collections, so those routes do not render. The product-card Brand
line is the highest-risk uncovered surface — it is `text-teal-500` at 13px
and only stays invisible here because QA fixtures carry no `custom.brand_name`.
