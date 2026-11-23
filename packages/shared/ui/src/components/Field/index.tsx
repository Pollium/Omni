import { FormApi } from '../../contracts/form';
import { TextField, Label, Input, FieldError } from '@heroui/react';
import { ReactNode } from 'react';

interface FieldProps<T extends object>{
    form: FormApi<T>;
    name: keyof T & string;
    label: string;
    labelAside?: ReactNode;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
}

const Field = <T extends object>({
    form,
    name,
    label,
    labelAside,
    type = 'text',
    placeholder,
    autoComplete
}: FieldProps<T>) => {
    const binding = form.field(name);

    const onChange = (value: string) => {
        binding.onChange(value as T[keyof T & string]);
    };

    const caption = <Label>{label}</Label>;

    return (
        <TextField
            name={binding.name}
            type={type}
            value={String(binding.value)}
            onChange={onChange}
            onBlur={binding.onBlur}
            isInvalid={binding.isInvalid}
            isDisabled={form.submitting}
            validationBehavior='aria'
            fullWidth
        >
            {labelAside === undefined ? caption : (
                <div className='flex items-baseline justify-between gap-3'>
                    {caption}
                    {labelAside}
                </div>
            )}
            <Input placeholder={placeholder} autoComplete={autoComplete} />
            <FieldError>{binding.errorMessage}</FieldError>
        </TextField>
    );
};

export default Field;
