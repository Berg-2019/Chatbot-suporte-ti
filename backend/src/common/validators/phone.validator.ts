import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsBrazilianPhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: string) {
    if (!phone) return false;

    // Remove non-numeric characters
    phone = phone.replace(/\D/g, '');

    // Check length (10 or 11 digits)
    // Format: (XX) XXXX-XXXX or (XX) 9XXXX-XXXX
    if (phone.length !== 10 && phone.length !== 11) return false;

    // Check if starts with valid DDD (area code 11-99)
    const ddd = parseInt(phone.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;

    // If 11 digits, 3rd digit must be 9 (mobile)
    if (phone.length === 11 && phone.charAt(2) !== '9') return false;

    return true;
  }

  defaultMessage() {
    return 'Telefone brasileiro inválido (formato: (XX) XXXXX-XXXX)';
  }
}

export function IsBrazilianPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBrazilianPhoneConstraint,
    });
  };
}
