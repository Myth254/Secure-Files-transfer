import { useState, useMemo, useCallback } from "react";

/**
 * Custom hook for pagination
 * @param {Array} items - Array of items to paginate
 * @param {number} itemsPerPage - Number of items per page
 * @returns {Object} Pagination state and functions
 */
export const usePagination = (items = [], itemsPerPage = 20) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);

  const totalPages = useMemo(
    () => Math.ceil(items.length / pageSize),
    [items.length, pageSize],
  );

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * pageSize;
    const indexOfFirstItem = indexOfLastItem - pageSize;
    return items.slice(indexOfFirstItem, indexOfLastItem);
  }, [items, currentPage, pageSize]);

  const goToPage = useCallback(
    (page) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const changePageSize = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  return {
    currentPage,
    pageSize,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};
