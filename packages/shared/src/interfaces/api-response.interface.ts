/** 所有接口统一的成功响应结构 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/** 异常响应结构，与成功响应同构，额外带出错路径 */
export interface ApiErrorResponse {
  code: number;
  message: string;
  data: null;
  path: string;
  timestamp: number;
}

/** 分页查询的统一返回体 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
