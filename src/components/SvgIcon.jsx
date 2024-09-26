import { useMemo } from 'react';

const SvgIcon = ({ name, title, color, style, className, size = 24 }) => {
    const getStyle = useMemo(() => {
        const dimension = `${parseInt(size, 10)}px`;
        return {
            width: dimension,
            height: dimension,
            ...style
        };
    }, [size, style]);

    return (
        <svg style={getStyle} className={`svg-icon ${className || ''}`}>
            {title && <title>{title}</title>}
            <use xlinkHref={`#icon-${name}`} fill={color} />
        </svg>
    );
};

export default SvgIcon;