// Pagination info returned by backend
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// One GRN item (adjust fields to match your backend schema)
export interface GrnItem {
  id: number;
  productName: string;
  quantity: number;
  // add more fields here (supplier, date, etc.)
}

// Full API response structure
export interface GrnResponse {
  data: GrnItem[];
  pagination: Pagination;
}