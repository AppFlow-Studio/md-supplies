import { describe, it, expect } from 'vitest'
import { buildBreadcrumbListSchema } from '../breadcrumb'

describe('buildBreadcrumbListSchema', () => {
  it('@context is https://schema.org', () => {
    expect(
      buildBreadcrumbListSchema([{ label: 'Exam Gloves' }])['@context'],
    ).toBe('https://schema.org')
  })

  it('@type is BreadcrumbList', () => {
    expect(
      buildBreadcrumbListSchema([{ label: 'Exam Gloves' }])['@type'],
    ).toBe('BreadcrumbList')
  })

  it('first element is always Home at position 1 with site URL', () => {
    const schema = buildBreadcrumbListSchema([{ label: 'Exam Gloves' }])
    const first = schema.itemListElement[0]
    expect(first.position).toBe(1)
    expect(first.name).toBe('Home')
    expect(first.item).toBe('https://mdsupplies.com/')
  })

  it('single item at position 2 with href', () => {
    const schema = buildBreadcrumbListSchema([
      { label: 'Exam Gloves', href: '/category/exam-gloves' },
    ])
    const second = schema.itemListElement[1]
    expect(second.position).toBe(2)
    expect(second.name).toBe('Exam Gloves')
    expect(second.item).toBe('https://mdsupplies.com/category/exam-gloves')
  })

  it('last item uses currentUrl when item has no href', () => {
    const schema = buildBreadcrumbListSchema(
      [{ label: 'Exam Gloves' }],
      'https://mdsupplies.com/category/exam-gloves',
    )
    const last = schema.itemListElement[schema.itemListElement.length - 1]
    expect(last.item).toBe('https://mdsupplies.com/category/exam-gloves')
  })

  it('last item has no item property when href absent and no currentUrl', () => {
    const schema = buildBreadcrumbListSchema([{ label: 'Exam Gloves' }])
    const last = schema.itemListElement[schema.itemListElement.length - 1]
    expect('item' in last).toBe(false)
  })

  it('three-level L2 breadcrumb is correct', () => {
    const schema = buildBreadcrumbListSchema(
      [
        { label: 'Exam Gloves', href: '/category/exam-gloves' },
        { label: 'Nitrile' },
      ],
      'https://mdsupplies.com/category/exam-gloves/nitrile',
    )
    expect(schema.itemListElement).toHaveLength(3)
    expect(schema.itemListElement[0].name).toBe('Home')
    expect(schema.itemListElement[1].name).toBe('Exam Gloves')
    expect(schema.itemListElement[1].item).toBe('https://mdsupplies.com/category/exam-gloves')
    expect(schema.itemListElement[2].name).toBe('Nitrile')
    expect(schema.itemListElement[2].item).toBe(
      'https://mdsupplies.com/category/exam-gloves/nitrile',
    )
  })

  it('positions are sequential starting at 1', () => {
    const schema = buildBreadcrumbListSchema([
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
      { label: 'C' },
    ])
    expect(schema.itemListElement.map((e) => e.position)).toEqual([1, 2, 3, 4])
  })
})
