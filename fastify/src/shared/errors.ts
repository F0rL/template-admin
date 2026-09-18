// 业务错误基类：携带 statusCode 与 code，由全局 errorHandler 透传
export class BusinessError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
    readonly code: string = 'BUSINESS_ERROR',
  ) {
    super(message)
    this.name = 'BusinessError'
  }
}

export class NotFoundError extends BusinessError {
  constructor(message = '资源不存在') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends BusinessError {
  constructor(message = '未登录或会话已过期') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends BusinessError {
  constructor(message = '无权访问') {
    super(message, 403, 'FORBIDDEN')
  }
}
