import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, OnInit } from '@angular/core';
import { MatTreeFlattener, MatTreeFlatDataSource } from '@angular/material/tree';

interface NavNode {
  name: string;
  link: string[];
  children?: NavNode[];
}

interface ExampleFlatNode {
  expandable: boolean;
  name: string;
  level: number;
}

const TREE_DATA: NavNode[] = [{
  name: 'A*算法',
  link: ['/astar']
}];

@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.less']
})
export class SideMenuComponent implements OnInit {
  private _transformer = (node: NavNode, level: number) => {
    return {
      expandable: !!node.children && node.children.length > 0,
      name: node.name,
      link: node.link,
      level: level,
    };
  }

  treeControl = new FlatTreeControl<ExampleFlatNode>(
    node => node.level, node => node.expandable);

  treeFlattener = new MatTreeFlattener(
    this._transformer, node => node.level, node => node.expandable, node => node.children);

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  constructor() { 
    this.dataSource.data = TREE_DATA;
  }

  ngOnInit(): void {
  }

  hasChild = (_: number, node: ExampleFlatNode) => node.expandable;
}
