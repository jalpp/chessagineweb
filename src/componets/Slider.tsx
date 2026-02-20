import { Slider as MuiSlider, Stack, Typography } from '@mui/material';

interface Props {
    value: number;
    setValue: (value: number) => void;
    min: number;
    max: number;
    label?: string;
    disable?: boolean;
    valueLabel?: (value: number) => string;
}


export default function Slider({ min, max, label, value, setValue, valueLabel, disable }: Props) {
    return (
        <Stack direction='row' alignItems='center' width={1}>
            <Typography sx={{ mr: 2 }}>{label}</Typography>

            <MuiSlider
                min={min}
                max={max}
                step={1}
                disabled={disable}
                valueLabelDisplay='auto'
                valueLabelFormat={valueLabel}
                value={value}
                onChange={(_, value) => setValue(value)}
                aria-labelledby={`input-${label}`}
                sx={{ flexGrow: 1, mr: 2.5}}
            />

            <Typography sx={{ textWrap: 'nowrap' }}>
                {valueLabel ? valueLabel(value) : `${value} / ${max}`}
            </Typography>
        </Stack>
    );
}
