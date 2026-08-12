import { useState, useCallback } from 'react'

export function usePagination(initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [totalItems, setTotalItems] = useState(0)
  const [paginationLoading, setPaginationLoading] = useState(false)

  const resetPagination = useCallback(() => {
    setCurrentPage(1)
  }, [])

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    setTotalItems,
    paginationLoading,
    setPaginationLoading,
    resetPagination,
  }
}
