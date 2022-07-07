export class Context {
    constructor(
        public indented,
        public column,
        public type,
        public info,
        public align,
        public prev?
    ) { }
}