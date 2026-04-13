import { useTranslation } from 'react-i18next'
import { Textarea } from '@/components/ui/textarea'
import { useEventFormStore } from '../../stores/eventFormStore'
import { MapPin, Link, FileText } from 'lucide-react'

export function EventFormBottomSection() {
  const { t } = useTranslation()
  const place = useEventFormStore(s => s.place)
  const setPlace = useEventFormStore(s => s.setPlace)
  const url = useEventFormStore(s => s.url)
  const setUrl = useEventFormStore(s => s.setUrl)
  const memo = useEventFormStore(s => s.memo)
  const setMemo = useEventFormStore(s => s.setMemo)

  const inputClass = 'flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground'

  return (
    <div className="space-y-3">
      {/* Place */}
      <div className="flex items-center gap-3">
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          className={inputClass}
          placeholder={t('event.place', '장소 추가')}
          value={place}
          onChange={e => setPlace(e.target.value)}
        />
      </div>

      {/* URL */}
      <div className="flex items-center gap-3">
        <Link className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          className={inputClass}
          placeholder={t('event.url', 'URL 추가')}
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
      </div>

      {/* Memo */}
      <div className="flex items-start gap-3">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
        <Textarea
          className="flex-1 text-sm resize-none"
          placeholder={t('event.memo', '메모 추가')}
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={2}
        />
      </div>
    </div>
  )
}
