import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
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

  return (
    <div className="space-y-3">
      {/* Place */}
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          placeholder={t('event.place', '장소')}
          value={place}
          onChange={e => setPlace(e.target.value)}
        />
      </div>

      {/* URL */}
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          placeholder={t('event.url', 'URL')}
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
      </div>

      {/* Memo */}
      <div className="flex items-start gap-2">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
        <Textarea
          placeholder={t('event.memo', '메모')}
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )
}
