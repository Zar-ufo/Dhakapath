export type ReportStatus = 'pending' | 'corroborated' | 'resolved' | 'stale'
export interface CrowdReport { id: string; title: string; location: string; category: string; createdAt: string; corroborations: number; status: ReportStatus }

export const initialReports: CrowdReport[] = []

export function isStale(createdAt: string, now = new Date('2026-10-16T09:00:00Z')): boolean {
  return now.getTime() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000
}

export function validateReport(report: CrowdReport): CrowdReport {
  if (isStale(report.createdAt)) return { ...report, status: 'stale' }
  if (report.corroborations < 0 || report.corroborations > 100 || !report.title.trim() || !report.location.trim()) return { ...report, status: 'stale' }
  if (report.corroborations >= 5) return { ...report, status: 'corroborated' }
  return report
}

export function resolveReport(report: CrowdReport): CrowdReport {
  return { ...report, status: 'resolved' }
}

export function createReport(title: string, location: string, category = 'Community report'): CrowdReport {
  return validateReport({ id: `r-${Date.now()}`, title, location, category, createdAt: new Date().toISOString(), corroborations: 1, status: 'pending' })
}
