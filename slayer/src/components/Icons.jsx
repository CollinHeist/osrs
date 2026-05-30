/**
 * Pencil/edit icon.
 * @param {{ size?: number }} props
 */
export function EditIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" />
    </svg>
  );
}

/**
 * Trash/delete icon.
 * @param {{ size?: number }} props
 */
export function TrashIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3,4 13,4" />
      <path d="M5 4V2h6v2" />
      <path d="M12 4l-.75 9A1 1 0 0 1 10.256 14H5.744A1 1 0 0 1 4.75 13L4 4" />
      <line x1="6.5" y1="7" x2="6.5" y2="11" />
      <line x1="9.5" y1="7" x2="9.5" y2="11" />
    </svg>
  );
}
