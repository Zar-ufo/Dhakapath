export const NASA_WEATHER_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M%2CT2M_MAX%2CT2M_MIN%2CPRECTOTCORR%2CRH2M&community=SB&longitude=90.412&latitude=23.728&start=20261001&end=20261015&format=JSON'

type NasaPowerResponse = {
  properties?: {
    parameter?: {
      T2M?: Record<string, number>
      T2M_MAX?: Record<string, number>
      T2M_MIN?: Record<string, number>
      PRECTOTCORR?: Record<string, number>
      RH2M?: Record<string, number>
    }
  }
}

export type DhakaWeather = {
  date: string
  temperature: number
  maxTemperature: number
  minTemperature: number
  precipitation: number
  humidity: number
}

export async function fetchDhakaWeather(signal?: AbortSignal): Promise<DhakaWeather> {
  const response = await fetch(NASA_WEATHER_URL, { signal })
  if (!response.ok) throw new Error(`NASA weather request failed (${response.status})`)
  const data = await response.json() as NasaPowerResponse
  const parameter = data.properties?.parameter
  const dates = Object.keys(parameter?.T2M ?? {}).sort()
  const date = dates.reverse().find((candidate) => {
    const values = [parameter?.T2M?.[candidate], parameter?.T2M_MAX?.[candidate], parameter?.T2M_MIN?.[candidate], parameter?.PRECTOTCORR?.[candidate], parameter?.RH2M?.[candidate]]
    return values.every((value) => typeof value === 'number' && Number.isFinite(value) && value !== -999)
  })
  if (!date || !parameter?.T2M || !parameter.T2M_MAX || !parameter.T2M_MIN || !parameter.PRECTOTCORR || !parameter.RH2M) {
    throw new Error('NASA weather response did not include a complete daily record')
  }
  const values = [parameter.T2M[date], parameter.T2M_MAX[date], parameter.T2M_MIN[date], parameter.PRECTOTCORR[date], parameter.RH2M[date]]
  if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error('NASA weather response contained invalid daily values')
  }
  return {
    date,
    temperature: parameter.T2M[date],
    maxTemperature: parameter.T2M_MAX[date],
    minTemperature: parameter.T2M_MIN[date],
    precipitation: parameter.PRECTOTCORR[date],
    humidity: parameter.RH2M[date],
  }
}
