import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [{
	path: '',
	children: [
		{
			path: 'astar',
			loadChildren: () => import('./routes/astar/astar.module').then(m => m.AstarModule)
		},
		{
			path: 'code-editor',
			loadChildren: () => import('./routes/code-editor/code-editor.module').then(m => m.CodeEditorModule)
		},
		{
			path: 'three-d',
			loadChildren: () => import('./routes/three-D/three-d.module').then(m => m.ThreeDModule)
		},
		{
			path: 'connect-area',
			loadChildren: () => import('./routes/connect-areas/connect-areas.module').then(m => m.ConnectAreasModule)
		},
		{
			path: 'split-unite-region',
			loadChildren: () => import('./routes/split-unite-region/split-unite-region.module').then(m => m.SplitUniteRegionModule)
		},
		{
			path: 'image-desc',
			loadChildren: () => import('./routes/image-desc/image-desc.module').then(m => m.ImageDescModule)
		},
		{
			path: 'opencv',
			loadChildren: () => import('./routes/opencv/opencv.module').then(m => m.OpencvModule)
		},
		{
			path: 'procedual-anim',
			loadChildren: () => import('./routes/procedural-anim/procedural-anim.module').then(m => m.ProceduralAnimModule)
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
