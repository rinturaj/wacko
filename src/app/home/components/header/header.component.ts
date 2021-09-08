import { Component, OnInit } from '@angular/core';
import { GunDb } from 'src/app/services/gun-db.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  
  constructor(public db: GunDb) { }

  ngOnInit() {
  
    this.db.user.get('alias').once((ack:any)=>{
      console.log(ack);
      this.db.username = ack
    })
  }

}
