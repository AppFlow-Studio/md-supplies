export const GET_LOCALIZATION = `#graphql
  query GetLocalization {
    localization {
      country {
        isoCode
        name
        currency { isoCode symbol }
      }
      availableCountries {
        isoCode
        name
        currency { isoCode symbol }
      }
    }
  }
`
