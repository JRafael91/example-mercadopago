import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';

interface ICard {
  cardName: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  mercadopago: any;

  publicToken = environment.publicToken;

  // endpoint to process mercadopago payments
  mercadopagoAPI = "";


  listIdentificationTypes: any = [];
  amount = 10;

  payForm = this.fb.group({
    cardName: ['Rafael Acosta', [Validators.required]],
    cardNumber: ['4075595716483764',[Validators.required, Validators.minLength(16), Validators.maxLength(16), Validators.pattern('^[0-9]*$')]],
    expMonth: ['11', [Validators.required, Validators.minLength(2),Validators.maxLength(2),Validators.pattern('^[0-9]*$')]],
    expYear: ['25', [Validators.required, Validators.minLength(2),Validators.maxLength(2),Validators.pattern('^[0-9]*$')]],
    securityCode: ['123', [Validators.required, Validators.minLength(3),Validators.maxLength(3),Validators.pattern('^[0-9]*$')]],
  });

  constructor(private http: HttpClient, private fb: FormBuilder) {
  }

  async ngOnInit() {
    await this.getMercadoPagoAPI();
  }

  private async getMercadoPagoAPI() {
    // start mercadopago and  apply security
    this.mercadopago = new (window as any).MercadoPago(this.publicToken, {locale: 'es-MX',advancedFraudPrevention: true});
    let body =  document.body;
    let script = document.createElement('script');
    script.innerHTML = '';
    script.src = 'https://www.mercadopago.com/v2/security.js';
    script.setAttribute('view', 'checkout');
    script.setAttribute('output','deviceId');
    script.async = true;
    script.defer = true;
    body.appendChild(script);
  }

  async payWithMercadoPago() {
    if(!this.payForm.valid) {
      return this.payForm.markAllAsTouched();
    }

    try {
      const card: ICard = this.payForm.value as ICard;
      const paymentAmount = this.amount;
      const bin = card.cardNumber.substring(0,6);
      // returns a payment methods list
      const dataBin = await this.mercadopago.getPaymentMethods({bin});
      const paymentMethodId = dataBin.results[0].id;
      // returns all installments available
      const installments = await this.mercadopago.getInstallments({amount: paymentAmount.toString(),bin, locale: 'es-MX'});
      const payerCosts = installments[0].payer_costs[0].installments;
      // create token card
      const tokenRequest = {
        cardNumber : card.cardNumber,
        cardholderName : card.cardName,
        cardExpirationMonth : card.expMonth,
        cardExpirationYear : card.expYear,
        securityCode : card.securityCode
      };
      const cardToken = await this.mercadopago.createCardToken(tokenRequest);
      if(cardToken.status != "active") {
        return alert('Error al generar token');
      }
      // make payment
      return this.makePayment(cardToken.id,paymentMethodId,paymentAmount,payerCosts)
    } catch (error) {
      console.log('error token::',error);
      return alert(error);
    }
  }

  private async makePayment(token: string, paymentMethodId: string, amount: number, installments: number) {
    try {
      const deviceId = (document.getElementById('deviceId') as HTMLInputElement).value;
      const data = {
        token,
        paymentMethodId,
        amount,
        installments,
        userEmail: 'rafael@tecnofy.org',
        deviceId
      };
      const response = await this.http.post(`${this.mercadopagoAPI}`,data).toPromise();
      console.log('response::',response);
    } catch (error) {
      console.log('errorAPI::',error);
      return alert(error);
    }
  }
}
