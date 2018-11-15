<template>
    <div class="resizable-component" :style="style">
        <slot></slot>
        <template v-for="el in active">
            <div :class="'resizable-'+el" :key="el"></div>
        </template>
    </div>
</template>

<script>
    const ELEMENT_MASK = {
        'resizable-r': {bit: 0x0001, cursor: 'e-resize'},
        'resizable-rb': {bit: 0x0011, cursor: 'se-resize'},
        'resizable-b': {bit: 0x0010, cursor: 's-resize'},
        'resizable-lb': {bit: 0x0110, cursor: 'sw-resize'},
        'resizable-l': {bit: 0x0100, cursor: 'w-resize'},
        'resizable-lt': {bit: 0x1100, cursor: 'nw-resize'},
        'resizable-t': {bit: 0x1000, cursor: 'n-resize'},
        'resizable-rt': {bit: 0x1001, cursor: 'ne-resize'}
    };

    export default {
        props: {
            width: {
                default: 200,
                type: [Number, String]
            },
            minWidth: {
                default: 0,
                type: Number
            },
            maxWidth: {
                default: undefined,
                type: Number,
            },
            height: {
                default: 200,
                type: [Number, String]
            },
            minHeight: {
                default: 0,
                type: Number
            },
            maxHeight: {
                default: undefined,
                type: Number
            },
            left: {
                default: 0,
                type: [Number, String]
            },
            top: {
                default: 0,
                type: [Number, String]
            },
            active: {
                default: () => ['r', 'rb', 'b', 'lb', 'l', 'lt', 't', 'rt'],
                validator: (val) => new Set(['r', 'rb', 'b', 'lb', 'l', 'lt', 't', 'rt'].filter(value => val.indexOf(value) !== -1)).size === val.length,
                type: Array
            },
            fitParent: {
                default: false,
                type: Boolean
            }
        },
        data() {
            return {
                w: this.width, h: this.height,
                minW: this.minWidth, minH: this.minHeight,
                maxW: this.maxWidth, maxH: this.maxHeight,
                l: this.left, t: this.top,
                mouseX: 0, mouseY: 0,
                offsetX: 0, offsetY: 0,
                parent: {width: 0, height: 0},
                resizeState: 0,
            }
        },
        watch: {
            maxWidth(value) {
                this.maxW = value;
            },
            maxHeight(value) {
                this.maxH = value;
            },
            minWidth(value) {
                this.minW = value;
            },
            minHeight(value) {
                this.minH = value;
            },
            width(value) {
                typeof value === "number" && (this.w = value);
            },
            height(value) {
                typeof value === "number" && (this.h = value);
            },
            left(value) {
                typeof value === "number" && (this.l = value);
            },
            top(value) {
                typeof value === "number" && (this.t = value);
            }
        },
        mounted() {
            typeof this.width !== 'number' && (this.w = this.$el.clientWidth);
            typeof this.height !== 'number' && (this.h = this.$el.clientHeight);
            typeof this.left !== 'number' && (this.l = this.$el.offsetLeft - this.$el.parentElement.offsetLeft);
            typeof this.top !== 'number' && (this.t = this.$el.offsetTop - this.$el.parentElement.offsetTop);
            this.w < this.minW && (this.w = this.minW);
            this.h < this.minH && (this.h = this.minH);
            this.w > this.maxW && (this.w = this.maxW);
            this.h > this.maxH && (this.h = this.maxH);

            document.documentElement.addEventListener('mousemove', this.handleMove, true);
            document.documentElement.addEventListener('mousedown', this.handleDown, true);
            document.documentElement.addEventListener('mouseup', this.handleUp, true);
            this.$emit('resize:mount', {left: this.l, top: this.t, width: this.w, height: this.h});
        },
        beforeDestroy() {
            document.documentElement.removeEventListener('mousemove', this.handleMove, true);
            document.documentElement.removeEventListener('mousedown', this.handleDown, true);
            document.documentElement.removeEventListener('mouseup', this.handleUp, true);
            this.$emit('resize:destroy', {left: this.l, top: this.t, width: this.w, height: this.h});
        },
        computed: {
            style() {
                return {
                    width: typeof this.w === "number" ? this.w + 'px' : this.w,
                    height: typeof this.h === "number" ? this.h + 'px' : this.h,
                    left: typeof this.l === "number" ? this.l + 'px' : this.l,
                    top: typeof this.t === "number" ? this.t + 'px' : this.t
                }
            }
        },
        methods: {
            handleMove(event) {
                if (this.resizeState !== 0) {
                    let diffX = event.clientX - this.mouseX + this.offsetX,
                        diffY = event.clientY - this.mouseY + this.offsetY;
                    this.offsetX = this.offsetY = 0;
                    if (this.resizeState & 0x0001) {
                        if (this.w + diffX < this.minW)
                            this.offsetX = (diffX - (diffX = this.minW - this.w));
                        else if (this.maxW && this.w + diffX > this.maxW && (!this.fitParent || this.w + this.l < this.parent.width))
                            this.offsetX = (diffX - (diffX = this.maxW - this.w));
                        else if (this.fitParent && this.l + this.w + diffX > this.parent.width)
                            this.offsetX = (diffX - (diffX = this.parent.width - this.l - this.w));
                        this.w += diffX;
                    }
                    if (this.resizeState & 0x0010) {
                        if (this.h + diffY < this.minH)
                            this.offsetY = (diffY - (diffY = this.minH - this.h));
                        else if (this.maxH && this.h + diffY > this.maxH && (!this.fitParent || this.h + this.t < this.parent.height))
                            this.offsetY = (diffY - (diffY = this.maxH - this.h));
                        else if (this.fitParent && this.t + this.h + diffY > this.parent.height)
                            this.offsetY = (diffY - (diffY = this.parent.height - this.t - this.h));
                        this.h += diffY;
                    }
                    if (this.resizeState & 0x0100) {
                        if (this.w - diffX < this.minW)
                            this.offsetX = (diffX - (diffX = this.w - this.minW));
                        else if (this.maxW && this.w - diffX > this.maxW && this.l > 0)
                            this.offsetX = (diffX - (diffX = this.w - this.maxW));
                        else if (this.fitParent && this.l + diffX < 0)
                            this.offsetX = (diffX - (diffX = -this.l));
                        this.l += diffX;
                        this.w -= diffX;
                    }
                    if (this.resizeState & 0x1000) {
                        if (this.h - diffY < this.minH)
                            this.offsetY = (diffY - (diffY = this.h - this.minH));
                        else if (this.maxH && this.h - diffY > this.maxH && this.t > 0)
                            this.offsetY = (diffY - (diffY = this.h - this.maxH));
                        else if (this.fitParent && this.t + diffY < 0)
                            this.offsetY = (diffY - (diffY = -this.t));
                        this.t += diffY;
                        this.h -= diffY;
                    }
                    this.mouseX = event.clientX;
                    this.mouseY = event.clientY;
                    this.$emit('resize:move', {left: this.l, top: this.t, width: this.w, height: this.h});
                }
            },
            handleDown(event) {
                for (let elClass in ELEMENT_MASK) {
                    if (this.$el.contains(event.target) && event.target.classList.contains(elClass)) {
                        document.body.style.cursor = ELEMENT_MASK[elClass].cursor;
                        event.preventDefault && event.preventDefault();
                        this.offsetX = this.offsetY = 0;
                        this.mouseX = event.clientX;
                        this.mouseY = event.clientY;
                        this.resizeState = ELEMENT_MASK[elClass].bit;

                        const style = getComputedStyle ? getComputedStyle(this.$el.parentElement) : this.$el.parentElement.currentStyle;
                        if (style) {
                            this.parent.height = parseFloat(style.height);
                            this.parent.width = parseFloat(style.width);
                        }
                        this.$emit('resize:start', {left: this.l, top: this.t, width: this.w, height: this.h});
                        break;
                    }
                }
            },
            handleUp() {
                if (this.resizeState !== 0) {
                    this.resizeState = 0;
                    document.body.style.cursor = '';
                    this.$emit('resize:end', {left: this.l, top: this.t, width: this.w, height: this.h});
                }
            }
        },
        name: "v-resizable"
    }
</script>

<style scoped>
    .resizable-component {
        position: relative;
    }

    .resizable-component > .resizable-r {
        display: block;
        position: absolute;
        z-index: 90;
        touch-action: none;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        cursor: e-resize;
        width: 12px;
        right: -6px;
        top: 0;
        height: 100%;
    }

    .resizable-component > .resizable-rb {
        display: block;
        position: absolute;
        touch-action: none;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        cursor: se-resize;
        width: 12px;
        height: 12px;
        right: -6px;
        bottom: -6px;
        z-index: 91;
    }

    .resizable-component > .resizable-b {
        display: block;
        position: absolute;
        z-index: 90;
        touch-action: none;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        cursor: s-resize;
        height: 12px;
        bottom: -6px;
        width: 100%;
        left: 0;
    }

    .resizable-component > .resizable-lb {
        display: block;
        position: absolute;
        touch-action: none;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        cursor: sw-resize;
        width: 12px;
        height: 12px;
        left: -6px;
        bottom: -6px;
        z-index: 91;
    }

    .resizable-component > .resizable-l {
        display: block;
        position: absolute;
        z-index: 90;
        touch-action: none;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        cursor: w-resize;
        width: 12px;
        left: -6px;
        height: 100%;
        top: 0;
    }

    .resizable-component > .resizable-lt {
        display: block;
        position: absolute;
        touch-action: none;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        cursor: nw-resize;
        width: 12px;
        height: 12px;
        left: -6px;
        top: -6px;
        z-index: 91;
    }

    .resizable-component > .resizable-t {
        display: block;
        position: absolute;
        z-index: 90;
        touch-action: none;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        cursor: n-resize;
        height: 12px;
        top: -6px;
        width: 100%;
        left: 0;
    }

    .resizable-component > .resizable-rt {
        display: block;
        position: absolute;
        touch-action: none;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        cursor: ne-resize;
        width: 12px;
        height: 12px;
        right: -6px;
        top: -6px;
        z-index: 91;
    }
</style>