import { Component, OnInit } from '@angular/core';
import { NgGunRef, NgGunService } from 'ngx-gun';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
  
})
export class SigninComponent implements OnInit {
  next =false;
  private subs: Subscription[] = []
  private db: NgGunRef

  constructor( private _ngGun: NgGunService) { 
    this.db = this._ngGun.db
    
    
  }

  ngOnInit() {
    const testNode = this.db.get('test')
    this.subs = [
      // Keeps pushing values upon changes to this node:
      testNode.on().subscribe(data => {
        console.log(data)
      })
    ]

    // Gets data once and completes:
    testNode.val().subscribe(data => {
      console.log(data)
    })

    testNode.put({testing: true})

    setTimeout(() => {
      testNode.put({testing: true, timestamp: new Date().getTime()})
    }, 1000)
  }
  login(){

  }

}
