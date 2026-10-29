import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { collegePhotoCollections, type CollegePhotoCollection } from './college-photos'

export default function CollegePhotoGallery() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [collection, setCollection] = useState<CollegePhotoCollection | null>(null)
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!collection) return
    const element = dialog.current
    element?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = previous }
  }, [collection])
  function move(direction: number) {
    if (collection) setIndex((value) => (value + direction + collection.photos.length) % collection.photos.length)
  }
  const photo = collection?.photos[index]
  return <section className="cr-college-gallery" aria-labelledby="campus-gallery-title">
    <header><p className="cr-eyebrow">St Berchmans College</p><h2 id="campus-gallery-title">A closer look at your campus.</h2><p>Explore our halls, chapel and sports spaces. For reservations, choose an available resource from the catalogue above.</p></header>
    <div className="cr-college-gallery-grid">{collegePhotoCollections.map((item) => <button type="button" key={item.key} className="cr-college-gallery-card" onClick={() => { setIndex(0); setCollection(item) }} aria-label={`View ${item.photos.length} photos of ${item.name}`}>
      <img src={item.photos[0].url} alt={item.photos[0].altText} loading="lazy" width="709" height="400" />
      <span><strong>{item.name}</strong><small><Images size={15} />{item.photos.length} {item.photos.length === 1 ? 'photo' : 'photos'}</small></span>
    </button>)}</div>
    <dialog ref={dialog} className="cr-college-photo-dialog" aria-labelledby="college-photo-viewer-title" onClose={() => setCollection(null)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close() }} onKeyDown={(event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
    }}>
      {collection && photo && <div className="cr-college-photo-viewer">
        <header><div><h2 id="college-photo-viewer-title">{collection.name}</h2><p>{index + 1} of {collection.photos.length}</p></div><button type="button" className="cr-icon-button" aria-label="Close photo gallery" autoFocus onClick={() => dialog.current?.close()}><X size={22} /></button></header>
        <div className="cr-college-photo-stage"><img src={photo.url} alt={photo.altText} />{collection.photos.length > 1 && <><button className="cr-college-photo-prev" type="button" aria-label="Previous photo" onClick={() => move(-1)}><ChevronLeft /></button><button className="cr-college-photo-next" type="button" aria-label="Next photo" onClick={() => move(1)}><ChevronRight /></button></>}</div>
        <p className="cr-caption">{photo.altText}</p>
        {collection.photos.length > 1 && <div className="cr-college-photo-thumbs" aria-label="Choose a photo">{collection.photos.map((item, position) => <button key={item.id} type="button" aria-label={item.altText} aria-pressed={position === index} onClick={() => setIndex(position)}><img src={item.url} alt="" loading="lazy" /></button>)}</div>}
      </div>}
    </dialog>
  </section>
}
