export default class ReservationData {
	constructor(amountOfPeople, firstName, lastName, email, phone, creditCardNumber, creditCardExpirationMonth, creditCardExpirationYear, backOfTheCardCode) {
		this.amountOfPeople = amountOfPeople;
		this.firstName = firstName;
		this.lastName = lastName;
		this.email = email;
		this.phone = phone;
		this.creditCardNumber = creditCardNumber;
		this.creditCardExpirationMonth = creditCardExpirationMonth;
		this.creditCardExpirationYear = creditCardExpirationYear;
		this.backOfTheCardCode = backOfTheCardCode;
	}
}