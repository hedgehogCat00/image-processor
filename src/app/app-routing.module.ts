import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [{
	path: '',
	children: [
		{
			path: 'astar', 
			loadChildren: () => import('./astar/astar.module').then(m => m.AstarModule)
		},
		{
			path: '', redirectTo: 'astar', pathMatch: 'full'
		}
	]
}
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule { }
