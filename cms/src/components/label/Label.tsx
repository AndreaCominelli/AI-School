import React from "react";

type LabelProps = {
    text: string,
    size: 'sm' | 'md' | 'lg'
}

const computeFontSize = (size: 'sm' | 'md' | 'lg') => {
    switch(size) {
        case 'sm':
            return 12;
        case 'md':
            return 18;
        case 'lg':
            return 24;
    }
}

const Label: React.FC<LabelProps> = ({ text, size }: LabelProps) => {
    const fontSize = computeFontSize(size);
    return (
        <p style={{ fontSize }}>
            {text}
        </p>
    )
}

export default Label;