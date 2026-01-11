/**
 * Standard success response wrapper
 */
export const successResponse = <T>(data: T, message: string) => {
  return {
    success: true,
    data,
    message,
  };
};

/**
 * Standard error response wrapper
 */
export const errorResponse = (code: string, message: string) => {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
};
