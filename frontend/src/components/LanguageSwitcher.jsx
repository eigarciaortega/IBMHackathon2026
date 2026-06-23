/**
 * Selector de idioma (ES por defecto + EN, PT, FR, DE).
 * Inclusividad: permite usar la app en varios idiomas.
 */
import React from 'react'
import {
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLanguage } from '@coreui/icons'
import { useTranslation } from '../i18n'

export function LanguageSwitcher() {
  const { lang, setLang, languages } = useTranslation()
  const current = languages.find((l) => l.code === lang)

  return (
    <CDropdown variant="nav-item" placement="bottom-end">
      <CDropdownToggle caret={false} className="d-flex align-items-center gap-1">
        <CIcon icon={cilLanguage} size="lg" />
        <span className="small fw-semibold">{current?.short}</span>
      </CDropdownToggle>
      <CDropdownMenu>
        {languages.map((l) => (
          <CDropdownItem
            key={l.code}
            as="button"
            type="button"
            active={l.code === lang}
            onClick={() => setLang(l.code)}
          >
            <span className="fw-semibold me-2">{l.short}</span>
            {l.label}
          </CDropdownItem>
        ))}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default LanguageSwitcher
