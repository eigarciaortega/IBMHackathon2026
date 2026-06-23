/**
 * Marca IBM OfficeSpace. Las letras "IBM" se renderizan con las franjas
 * horizontales características (vía CSS), evocando la identidad de IBM.
 */
import React from 'react'
import { Link } from 'react-router-dom'

export function IbmLogo({ light = false, lg = false, showSub = true, to = null, ariaLabel }) {
  const mark = (
    <span className={`ibm-mark${lg ? ' ibm-mark--lg' : ''}`}>
      <span className={`ibm-mark__logo${light ? ' ibm-mark__logo--light' : ''}`}>IBM</span>
      {showSub && <span className="ibm-mark__sub">OfficeSpace</span>}
    </span>
  )

  if (!to) {
    return mark
  }

  return (
    <Link className="ibm-mark__link" to={to} aria-label={ariaLabel}>
      {mark}
    </Link>
  )
}

export default IbmLogo
