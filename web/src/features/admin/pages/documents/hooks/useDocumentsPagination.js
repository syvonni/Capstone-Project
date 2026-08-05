import { useState } from 'react'

export function useDocumentsPagination(items, pageSize) {
  const [page, setPage] = useState(1)

  const paginatedData = items.slice((page - 1) * pageSize, page * pageSize)
  const total = items.length

  return {
    page,
    setPage,
    paginatedData,
    total,
  }
}
