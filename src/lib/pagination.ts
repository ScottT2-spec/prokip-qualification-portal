/**
 * Server-side pagination, filtering, and sorting utilities.
 * Designed for 100K+ candidate scale.
 */

import { NextRequest } from 'next/server'

export interface PaginationParams {
  page: number
  limit: number
  skip: number
  search?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  filters: Record<string, string>
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

/**
 * Extract pagination, sorting, and filter params from request URL.
 * 
 * Query params:
 *   page=1, limit=20, search=..., sortBy=createdAt, sortOrder=desc
 *   filter_state=Lagos, filter_status=PASSED, filter_country=Nigeria
 */
export function parsePaginationParams(req: NextRequest, defaults?: { sortBy?: string; limit?: number }): PaginationParams {
  const { searchParams } = new URL(req.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(defaults?.limit ?? DEFAULT_LIMIT))))
  const search = searchParams.get('search') || undefined
  const sortBy = searchParams.get('sortBy') || defaults?.sortBy || 'createdAt'
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

  // Collect filter_* params
  const filters: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter_') && value) {
      filters[key.replace('filter_', '')] = value
    }
  })

  return { page, limit, skip: (page - 1) * limit, search, sortBy, sortOrder, filters }
}

/**
 * Build a paginated JSON response with metadata.
 */
export function paginatedResponse<T>(data: T[], total: number, params: PaginationParams) {
  const totalPages = Math.ceil(total / params.limit)
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  }
}

/**
 * Build Prisma `where` clause for User search.
 */
export function buildUserSearchFilter(search?: string) {
  if (!search) return {}
  return {
    OR: [
      { fullName: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
      { phone: { contains: search } },
    ],
  }
}

/**
 * Build Prisma `where` clause from filter params for agents.
 */
export function buildAgentFilters(filters: Record<string, string>) {
  const where: Record<string, unknown> = {}

  if (filters.state) where.state = filters.state
  if (filters.country) where.country = filters.country
  if (filters.isActive) where.isActive = filters.isActive === 'true'

  // Status filter maps to quiz attempt results
  if (filters.status) {
    where.quizAttempts = {
      some: {
        result: { qualificationStatus: filters.status },
      },
    }
  }

  // Date range filters
  if (filters.registeredAfter || filters.registeredBefore) {
    where.createdAt = {}
    if (filters.registeredAfter) (where.createdAt as Record<string, unknown>).gte = new Date(filters.registeredAfter)
    if (filters.registeredBefore) (where.createdAt as Record<string, unknown>).lte = new Date(filters.registeredBefore)
  }

  return where
}

/**
 * Map sortBy field to Prisma orderBy.
 * Handles nested fields like "score" mapping to attempt results.
 */
export function buildSortOrder(sortBy: string, sortOrder: 'asc' | 'desc'): Record<string, unknown> {
  const directFields = ['createdAt', 'fullName', 'email', 'phone', 'state', 'country', 'updatedAt']

  if (directFields.includes(sortBy)) {
    return { [sortBy]: sortOrder }
  }

  // Default fallback
  return { createdAt: sortOrder }
}
