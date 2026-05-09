const moneyFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const shortDateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const shortDateFormatter = new Intl.DateTimeFormat('es-AR')

const longDateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function formatMoney(value: number) {
  return `$ ${moneyFormatter.format(value)}`
}

export function formatShortDateTime(value: string | Date) {
  return shortDateTimeFormatter.format(new Date(value))
}

export function formatShortDate(value: string | Date) {
  return shortDateFormatter.format(new Date(value))
}

export function formatLongDate(value: string | Date) {
  return longDateFormatter.format(new Date(value))
}
