import { useState, useCallback, useEffect } from 'react';

/**
 * Loại các giá trị không mong muốn khỏi form value
 * @param {*} value - Giá trị cần sanitize
 * @returns {*} Giá trị đã được sanitize
 */
const sanitizeValue = (value) => {
  // Xử lý null hoặc undefined
  if (value === null || value === undefined) return '';
  
  // Giữ nguyên giá trị boolean, number hoặc đối tượng khác
  if (typeof value !== 'string') return value;
  
  // Loại bỏ các ký tự điều khiển và khoảng trắng thừa
  return value.trim();
};

/**
 * Hook quản lý form data và validation
 * @param {Object} options - Tùy chọn cấu hình
 * @param {Object} options.initialValues - Giá trị ban đầu của form
 * @param {Function} options.validate - Hàm validate form
 * @param {Function} options.onSubmit - Hàm xử lý khi submit form
 * @returns {Object} Form state và handlers
 */
export function useForm({
  initialValues = {},
  validate,
  onSubmit,
} = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  
  // Reset form khi initialValues thay đổi
  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [JSON.stringify(initialValues)]);
  
  // Theo dõi xem form có thay đổi so với initialValues không
  useEffect(() => {
    const hasChanged = Object.keys(initialValues).some(
      key => initialValues[key] !== values[key]
    );
    setIsDirty(hasChanged);
  }, [values, initialValues]);

  // Xác thực form
  const validateForm = useCallback(() => {
    if (!validate) return {};
    
    const validationErrors = validate(values) || {};
    setErrors(validationErrors);
    
    return validationErrors;
  }, [values, validate]);

  // Xử lý thay đổi giá trị input
  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({
      ...prev,
      [name]: sanitizeValue(newValue),
    }));
    
    // Đánh dấu field đã được chạm vào
    if (!touched[name]) {
      setTouched(prev => ({ ...prev, [name]: true }));
    }
  }, [touched]);

  // Cập nhật giá trị trực tiếp
  const setValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: sanitizeValue(value),
    }));
  }, []);

  // Cập nhật nhiều giá trị cùng lúc
  const setMultipleValues = useCallback((newValues) => {
    setValues(prev => {
      const sanitizedValues = {};
      Object.keys(newValues).forEach(key => {
        sanitizedValues[key] = sanitizeValue(newValues[key]);
      });
      
      return {
        ...prev,
        ...sanitizedValues
      };
    });
  }, []);

  // Xử lý blur event
  const handleBlur = useCallback((event) => {
    const { name } = event.target;
    
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate lại field khi user blur
    if (validate) {
      const validationErrors = validate({...values}) || {};
      setErrors(validationErrors);
    }
  }, [values, validate]);

  // Đánh dấu field đã chạm vào
  const setFieldTouched = useCallback((name, value = true) => {
    setTouched(prev => ({ ...prev, [name]: value }));
  }, []);

  // Đánh dấu tất cả các field đã chạm vào
  const touchAll = useCallback(() => {
    const touchedFields = {};
    Object.keys(values).forEach(key => {
      touchedFields[key] = true;
    });
    setTouched(touchedFields);
  }, [values]);

  // Đặt lại error cho một field cụ thể
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  // Xử lý submit form
  const handleSubmit = useCallback((event) => {
    if (event) {
      event.preventDefault();
    }
    
    touchAll();
    setSubmitCount(prev => prev + 1);
    
    // Validate form trước khi submit
    const validationErrors = validate ? validate(values) : {};
    setErrors(validationErrors);
    
    // Chỉ submit nếu không có lỗi
    const hasErrors = Object.keys(validationErrors).length > 0;
    if (!hasErrors && onSubmit) {
      setIsSubmitting(true);
      
      // Wrap trong Promise.resolve để xử lý cả async và sync onSubmit
      Promise.resolve(onSubmit(values))
        .catch(err => {
          console.error('Form submission error:', err);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    } else {
      setIsSubmitting(false);
    }
    
    return !hasErrors;
  }, [values, validate, onSubmit, touchAll]);

  // Reset form về giá trị ban đầu
  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsDirty(false);
  }, [initialValues]);

  // Kiểm tra xem form có hợp lệ không
  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isValid,
    submitCount,
    
    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,
    
    // Setters
    setValue,
    setValues: setMultipleValues,
    setFieldTouched,
    setFieldError,
    setErrors,
    
    // Actions
    validateForm,
    resetForm,
    touchAll,
  };
}

export default useForm;