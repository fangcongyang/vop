

const DEFAULT_LOADING = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const LazyImage = ({ url, onLoad }) => {
    return (
        <img data-src={url} src={DEFAULT_LOADING} className="lazyload" onLoad={onLoad}
            onError={(e) => {
                const img = e.currentTarget;
                img.src = DEFAULT_LOADING;
                img.onerror = null;
            }} />
    )
}

export default LazyImage;