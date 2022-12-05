import { Component, VERSION } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { SpinnerService } from './services/spinner.service';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor(
    private http: HttpClient,
    private sanitized: DomSanitizer,
    public spinnerService: SpinnerService
  ) {}

  readonly API_URL = 'https://ogcie.iblsoft.com/ria/opmetquery/ria/dbr';
  errorMessage = '';
  showError = false;
  data = [];
  groupedData = {};
  metar = true;
  sigmet = false;
  taf = false;

  // patterns for country and airport validation, multiple can be inserted with space between
  airport = new FormControl('LKPR', [
    Validators.pattern('^[A-Z]{4}(\\s[A-Z]{4})*'),
  ]);
  country = new FormControl('CZ', [
    Validators.pattern('^[A-Z]{2}(\\s[A-Z]{2})*'),
  ]);

  // ngOnInit() {
  //   this.getData();
  // }

  /**
   * Function shows error message for validation
   */
  showErrorMessage(error) {
    this.showError = true;
    this.data = [];
    this.errorMessage = error;
  }
  /**
   * Function uses regex to mark certain substrings in result data
   */
  highlightText(text) {
    const replaced = text.replace(/(FEW|BKN|SCT)([0-9]{3})/g, (g1, g2, g3) => {
      var prefix = '';
      if (g3 > 30) {
        // red highlight text
        return '<b style="color:red">' + g1 + '</b>';
      } else {
        //blue highlight text
        return '<b style="color:blue">' + g1 + '</b>';
      }
    });
    return replaced;
  }

  /**
   * Helper function to build body for request for API
   */
  buildQueryParams() {
    let countries = [];
    let airports = [];
    let reportTypes = [];

    if (this.metar) reportTypes.push('METAR');
    if (this.sigmet) reportTypes.push('SIGMET');
    if (this.taf) reportTypes.push('TAF');

    if (this.airport.value !== '') {
      airports = this.airport.value.split(' ');
      console.log(this.airport.value);
    }

    if (this.country.value !== '') {
      countries = this.country.value.split(' ');
    }

    return {
      id: 'interviewId',
      method: 'query',
      params: [
        {
          id: '',
          reportTypes: reportTypes,
          stations: airports,
          countries: countries,
        },
      ],
    };
  }

  /**
   * Function validates UI input and returns true if is valid, false if not
   */
  validateParams() {
    if (this.metar || this.sigmet || this.taf) {
      if (this.airport.value !== '' || this.country.value !== '') {
        // filled at least one country or airport
        if (!this.airport.errors && !this.country.errors) {
          this.showError = false;
          return true;
        } else {
          this.showErrorMessage(
            'Put countries and airports in correct format.'
          );
          return false;
        }
      } else {
        // no airport or country
        this.showErrorMessage('Input at least one airport or country.');
        console.log(this.errorMessage);
        return false;
      }
    } else {
      // no checkbox selected
      this.showErrorMessage('Select at least one message type.');
      console.log(this.errorMessage);
      return false;
    }
  }
  /**
   * Function to group data by stationId
   */
  groupByCategory() {
    return this.data.reduce((group, product) => {
      const { stationId } = product;
      group[stationId] = group[stationId] ?? [];
      product.text = this.sanitized.bypassSecurityTrustHtml(
        this.highlightText(product.text)
      );
      // console.log(product.text);
      group[stationId].push(product);
      return group;
    }, {});
  }
  /**
   * Function to get API data based on input, data is grouped and shown in table
   * */
  getData() {
    this.groupedData = {};
    // check if input is valid
    if (!this.validateParams()) return;
    // build parameters with helper function
    const body = this.buildQueryParams();

    this.http.post<any>(this.API_URL, body).subscribe((data) => {
      if (data.error) {
        this.data = [];
        console.log('Error while catching data', data.error);
        return;
      }
      this.data = data.result;
      this.groupedData = this.groupByCategory();
    });
  }
}
