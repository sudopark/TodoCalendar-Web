import { useTranslation } from 'react-i18next'

// iOS EventTagDetailViewModelImple.suggestColorHexes 와 동일한 27색 팔레트.
// 사용자가 충분히 다양한 색을 고를 수 있어야 한다는 QA 피드백 반영.
export const PRESET_COLORS = [
  '#F42D2D', '#F9316D', '#FF5722', '#FD838F', '#FFA02E', '#F6DC41', '#B75F17',
  '#6800f2', '#9370DB', '#6A5ACD', '#4034AB', '#1E90FF', '#4682B4', '#5F9EA0',
  '#4561DB', '#5e86d6', '#87CEEB', '#088CDA', '#AFEEEE', '#036A73', '#3CB371',
  '#06A192', '#41E6EC', '#72E985', '#CCD0DC', '#828DA9', '#8DACF6',
]

interface ColorPaletteProps {
  colors?: string[]
  selected: string
  onChange: (hex: string) => void
}

export function ColorPalette({ colors = PRESET_COLORS, selected, onChange }: ColorPaletteProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map(color => (
        <button
          key={color}
          type="button"
          title={color}
          aria-label={t('common.select_color', { hex: color })}
          aria-pressed={selected === color}
          onClick={() => onChange(color)}
          className={`h-7 w-7 rounded-full border-2 transition-transform ${
            selected === color ? 'border-action scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
