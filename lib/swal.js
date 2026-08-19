import Swal from 'sweetalert2'

// Custom themed SweetAlert2 instance tailored to Siddhi Farm Resort styling
const themeSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-3xl border border-[#dfe7dc] shadow-2xl p-6 font-sans',
    title: 'text-xl font-serif text-[#173d35] font-bold',
    htmlContainer: 'text-sm text-slate-600 leading-relaxed',
    confirmButton: 'button-primary px-6 py-2.5 rounded-full font-medium text-sm inline-flex items-center justify-center gap-2 cursor-pointer shadow-md',
    cancelButton: 'px-5 py-2.5 rounded-full font-medium text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 ml-2 inline-flex items-center justify-center cursor-pointer',
    denyButton: 'px-5 py-2.5 rounded-full font-medium text-sm text-red-700 bg-red-50 hover:bg-red-100 ml-2 inline-flex items-center justify-center cursor-pointer',
  },
  buttonsStyling: false,
  confirmButtonColor: '#173d35',
})

/**
 * Display a success alert
 */
export async function showSuccess(title, text = '') {
  return themeSwal.fire({
    icon: 'success',
    iconColor: '#315d4c',
    title,
    text,
    confirmButtonText: 'Great!',
  })
}

/**
 * Display an error alert
 */
export async function showError(title, text = '') {
  return themeSwal.fire({
    icon: 'error',
    iconColor: '#dc2626',
    title,
    text,
    confirmButtonText: 'Dismiss',
  })
}

/**
 * Display an info/warning alert
 */
export async function showAlert(title, text = '', icon = 'info') {
  return themeSwal.fire({
    icon,
    iconColor: icon === 'warning' ? '#d97706' : '#315d4c',
    title,
    text,
    confirmButtonText: 'OK',
  })
}

/**
 * Display a stylish confirmation modal (replaces window.confirm)
 * @returns {Promise<boolean>} true if confirmed, false if cancelled
 */
export async function showConfirm({
  title = 'Are you sure?',
  text = 'This action cannot be undone.',
  confirmButtonText = 'Yes, Proceed',
  cancelButtonText = 'Cancel',
  icon = 'warning',
  isDanger = false,
} = {}) {
  const result = await themeSwal.fire({
    icon,
    iconColor: isDanger ? '#dc2626' : (icon === 'warning' ? '#d97706' : '#315d4c'),
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
  })
  return result.isConfirmed
}

/**
 * Display a transient toast notification
 */
export function showToast(title, icon = 'success') {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    iconColor: icon === 'success' ? '#315d4c' : (icon === 'error' ? '#dc2626' : '#d97706'),
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    },
  })
  return Toast.fire({
    icon,
    title,
  })
}

export default themeSwal
