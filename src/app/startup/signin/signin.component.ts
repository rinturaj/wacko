import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GunDb } from 'src/app/services/gun-db.service';


@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],

})
export class SigninComponent implements OnInit {


  err
  constructor(private db: GunDb,private router:Router) {



  }

  ngOnInit() {

  }
  login(value) {

    //  this.db.user.create(value.username, value.password, (err:any)=>{
    //    if(err){
    //     alert(err.err)
    //     console.log(err);
    //    }else{
    this.err = ''
    this.db.user.auth(value.username, value.password, (ack: any) => {
      if (ack.err) {
        this.err = ack.err
      } else {
        this.router.navigateByUrl('home')
      }
    })
    //    }
    //  })

  }

}
