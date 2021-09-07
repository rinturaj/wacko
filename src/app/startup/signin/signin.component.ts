import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { GunDb } from 'src/app/services/gun-db.service';


@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],

})
export class SigninComponent implements OnInit {
  next = false;
  private subs: Subscription[] = []


  constructor(private db: GunDb) {
   


  }
  carl
  ngOnInit() {
  
  }
  login(value) {
    console.log(value);
    
   this.db.user.create(value.username, value.password, (err:any)=>{
     if(err){
      alert(err.err)
      console.log(err);
      
     }else{
      this.db.user.auth(value.username, value.password)
     }
   })

  }

}
