import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  slideOpts = {
    initialSlide: 10,
    speed: 400,
    slidesPerView: 5,
    spaceBetween: 10,
    centeredSlidesBounds:true,
    zoom: {
      maxRatio: 5,
    },
  };

  constructor() { }

 

 
}
