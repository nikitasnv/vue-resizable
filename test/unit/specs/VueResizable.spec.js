import {expect} from 'chai'
import {mount} from '@vue/test-utils'
import VueResizable from '../../../src/components/vue-resizable';

describe('VueResizable.vue', () => {
    it(`should render component correctly`, () => {
        const vmWrapper = mount(VueResizable);
        expect(vmWrapper.element).to.be.ok;
        expect(vmWrapper.is('div')).to.be.true;
        expect(vmWrapper.classes('resizable-component')).to.be.true;
    });

    it(`should render content correctly`, () => {
        const Content = {
            template: `<div class="content">Content</div>`,
        };
        const vmWrapper = mount(VueResizable, {
            slots: {
                default: Content
            }
        });

        expect(vmWrapper.contains(Content)).to.be.true;
    });

    describe('Resize props', () => {
        it(`should have default values`, () => {
            const vmWrapper = mount(VueResizable);
            expect(vmWrapper.element.style.width).to.equal('200px');
            expect(vmWrapper.element.style.height).to.equal('200px');
            expect(vmWrapper.element.style.top).to.equal('0px');
            expect(vmWrapper.element.style.left).to.equal('0px');
        });

        it(`should init with string value correctly`, (done) => {
            const width = 655, height = 555, offset = 30;
            const Parent = {
                template: `
                <div style="width: ${width}px; height: ${height}px; padding: ${offset}px; margin: ${offset}px">
                    <vue-resizable width="47%" height="47%" left="17%" top="17%"> 
                    </vue-resizable>
                </div>`,
                components: {VueResizable}
            };

            const vmWrapper = mount(Parent, {
                attachToDocument: true
            }).find(VueResizable);

            vmWrapper.vm.$nextTick(function () {
                expect(vmWrapper.element.style.width).to.equal(Math.round(width * 0.47) + 'px');
                expect(vmWrapper.element.style.height).to.equal(Math.round(height * 0.47) + 'px');
                expect(vmWrapper.element.style.left).to.equal(Math.round(width * 0.17) + offset + 'px');
                expect(vmWrapper.element.style.top).to.equal(Math.round(height * 0.17) + offset + 'px');
                done();
            });
        });

        it(`should init with number value correctly`, () => {
            const vmWrapper = mount(VueResizable, {
                propsData: {
                    width: 655,
                    height: 555,
                    left: 30,
                    top: 30
                },
            });

            expect(vmWrapper.element.style.width).to.equal(655 + 'px');
            expect(vmWrapper.element.style.width).to.equal(655 + 'px');
            expect(vmWrapper.element.style.top).to.equal(30 + 'px');
            expect(vmWrapper.element.style.left).to.equal(30 + 'px');
        });

        it(`should resize on props change`, () => {
            const vmWrapper = mount(VueResizable);
            vmWrapper.setProps({width: 655, height: 555, left: 30, top: 30});

            expect(vmWrapper.element.style.width).to.equal(655 + 'px');
            expect(vmWrapper.element.style.height).to.equal(555 + 'px');
            expect(vmWrapper.element.style.top).to.equal(30 + 'px');
            expect(vmWrapper.element.style.left).to.equal(30 + 'px');
        });
    });
    describe('Constraint props', () => {
        it(`should have default values`, () => {
            const vmWrapper = mount(VueResizable);
            expect(vmWrapper.vm.minW).to.equal(0);
            expect(vmWrapper.vm.minH).to.equal(0);
            expect(vmWrapper.vm.maxH).to.be.undefined;
            expect(vmWrapper.vm.maxW).to.be.undefined;
        });

        it(`should init maxProps with number value correctly`, (done) => {
            const vmWrapper = mount(VueResizable, {
                propsData: {
                    maxWidth: 655,
                    width: 755,
                    maxHeight: 555,
                    height: 655
                },
            });
            vmWrapper.vm.$nextTick(function () {
                expect(vmWrapper.element.style.width).to.equal(655 + 'px');
                expect(vmWrapper.element.style.height).to.equal(555 + 'px');
                done();
            });
        });
        it(`should init minProps with number value correctly`, (done) => {
            const vmWrapper = mount(VueResizable, {
                propsData: {
                    minWidth: 300,
                    width: 100,
                    minHeight: 300,
                    height: 100
                },
            });
            vmWrapper.vm.$nextTick(function () {
                expect(vmWrapper.element.style.width).to.equal(300 + 'px');
                expect(vmWrapper.element.style.height).to.equal(300 + 'px');
                done();
            });
        });

        it(`should update on props change`, () => {
            const vmWrapper = mount(VueResizable);

            vmWrapper.setProps({minWidth: 100, minHeight: 200, maxHeight: 500, maxWidth: 300});

            expect(vmWrapper.vm.minW).to.equal(100);
            expect(vmWrapper.vm.minH).to.equal(200);
            expect(vmWrapper.vm.maxH).to.equal(500);
            expect(vmWrapper.vm.maxW).to.equal(300);
        });
    });

    describe('Resize events', () => {
        const Parent = {
            template: `
                <div style="width: 672px; height: 672px;">
                    <vue-resizable :width="200" :height="200" :minHeight="100" :minWidth="100" :maxHeight="300" :maxWidth="300" :fitParent="true"> 
                    </vue-resizable>
                </div>`,
            components: {VueResizable}
        };
        const vmWrapper = mount(Parent, {
            attachToDocument: true
        }).find(VueResizable);
        const elWrapper = vmWrapper.find('div.resizable-rb');
        const rect = vmWrapper.element.getBoundingClientRect();
        let fromX = rect.right;
        let fromY = rect.bottom;

        it(`should generate event on component mounted`, () => {
            expect(vmWrapper.emitted()['mount']).to.be.ok;
            expect(vmWrapper.emitted()['mount'].length).to.equal(1);
            expect(vmWrapper.emitted()['mount'][0][0]).to.deep.equal({eventName: 'mount', height: 200, left: 0, top: 0, width: 200});
        });

        it(`should generate event on mousedown`, () => {
            elWrapper.trigger('mousedown', {
                clientX: fromX, clientY: fromY
            });
            expect(vmWrapper.emitted()['resize:start']).to.be.ok;
            expect(vmWrapper.emitted()['resize:start'].length).to.equal(1);
            expect(vmWrapper.vm.mouseX).to.equal(fromX);
            expect(vmWrapper.vm.mouseY).to.equal(fromY);
            expect(vmWrapper.vm.parent.width).to.equal(672);
            expect(vmWrapper.vm.parent.height).to.equal(672);
            expect(vmWrapper.vm.resizeState).to.equal(0b0011);
            expect(document.body.style.cursor).to.equal('se-resize');
        });

        it(`should generate event on mousemove`, () => {
            elWrapper.trigger('mousemove', {
                clientX: fromX + 10, clientY: fromY + 10
            });
            expect(vmWrapper.emitted()['resize:move']).to.be.ok;
            expect(vmWrapper.emitted()['resize:move'].length).to.equal(1);
            expect(vmWrapper.vm.mouseX).to.equal(fromX + 10);
            expect(vmWrapper.vm.mouseY).to.equal(fromY + 10);
        });

        it(`should generate event on mouseup`, () => {
            elWrapper.trigger('mouseup');
            expect(vmWrapper.emitted()['resize:end']).to.be.ok;
            expect(vmWrapper.emitted()['resize:end'].length).to.equal(1);
            expect(vmWrapper.vm.resizeState).to.equal(0);
            expect(document.body.style.cursor).to.be.empty;
        });

        it(`should generate event on component destroyed`, () => {
            vmWrapper.destroy();
            expect(vmWrapper.emitted()['destroy']).to.be.ok;
            expect(vmWrapper.emitted()['destroy'].length).to.equal(1);
        });
    });

    describe('Resize methods', () => {
        const Parent = {
            template: `
                <div style="width: 500px; height: 500px;">
                    <vue-resizable :width="200" :height="200" :minHeight="100" :minWidth="100" :maxHeight="300" :maxWidth="300" :fitParent="true"> 
                    </vue-resizable>
                </div>`,
            components: {VueResizable}
        };
        it(`should resize right/bottom correctly`, () => {
            const vmWrapper = mount(Parent, {
                attachToDocument: true
            }).find(VueResizable);
            const elWrapper = vmWrapper.find('div.resizable-rb');
            const rect = vmWrapper.element.getBoundingClientRect();
            let fromX = rect.right;
            let fromY = rect.bottom;

            elWrapper.trigger('mousedown', {
                clientX: fromX, clientY: fromY
            });
            for (let i = 1; i <= 30; i++) {
                elWrapper.trigger('mousemove', {
                    clientX: fromX + i * 10, clientY: fromY + i * 10
                });
                const currentSize = 200 + i * 10;
                expect(vmWrapper.element.style.width).to.equal((currentSize <= 300 ? currentSize : 300) + 'px');
                expect(vmWrapper.element.style.height).to.equal((currentSize <= 300 ? currentSize : 300) + 'px');
            }
            elWrapper.trigger('mouseup');

            vmWrapper.setProps({maxWidth: undefined, maxHeight: undefined});
            elWrapper.trigger('mousedown', {
                clientX: fromX + 100, clientY: fromY + 100
            });
            for (let i = 1; i <= 30; i++) {
                elWrapper.trigger('mousemove', {
                    clientX: (fromX + 100) + i * 10, clientY: (fromY + 100) + i * 10
                });
                const currentSize = 300 + i * 10;
                expect(vmWrapper.element.style.width).to.equal((currentSize <= 500 ? currentSize : 500) + 'px');
                expect(vmWrapper.element.style.height).to.equal((currentSize <= 500 ? currentSize : 500) + 'px');
            }
            elWrapper.trigger('mouseup');

            vmWrapper.setProps({fitParent: false});
            elWrapper.trigger('mousedown', {
                clientX: fromX + 500, clientY: fromY + 500
            });
            for (let i = 1; i <= 10; i++) {
                elWrapper.trigger('mousemove', {
                    clientX: (fromX + 500) + i * 10, clientY: (fromY + 500) + i * 10
                });
                const currentSize = 500 + i * 10;
                expect(vmWrapper.element.style.width).to.equal(currentSize + 'px');
                expect(vmWrapper.element.style.height).to.equal(currentSize + 'px');
            }
            elWrapper.trigger('mouseup');

            elWrapper.trigger('mousedown', {
                clientX: fromX + 400, clientY: fromY + 400
            });
            for (let i = 1; i <= 60; i++) {
                elWrapper.trigger('mousemove', {
                    clientX: (fromX + 400) - i * 10, clientY: (fromY + 400) - i * 10
                });
                const currentSize = 600 - i * 10;
                expect(vmWrapper.element.style.width).to.equal((currentSize >= 100 ? currentSize : 100) + 'px');
                expect(vmWrapper.element.style.height).to.equal((currentSize >= 100 ? currentSize : 100) + 'px');
            }
            elWrapper.trigger('mouseup');
        });

        it(`should resize left/top correctly`, () => {
            const vmWrapper = mount(Parent, {
                attachToDocument: true
            }).find(VueResizable);
            const elWrapper = vmWrapper.find('div.resizable-lt');
            const rect = vmWrapper.element.getBoundingClientRect();
            let fromX = rect.left;
            let fromY = rect.top;

            elWrapper.trigger('mousedown', {
                clientX: fromX, clientY: fromY
            });
            for (let i = 1; i <= 30; i++) {
                elWrapper.trigger('mousemove', {
                    clientX: fromX + i * 10, clientY: fromY + i * 10
                });
                const currentOffset = i * 10;
                const currentSize = 200 - currentOffset;
                expect(vmWrapper.element.style.width).to.equal((currentSize >= 100 ? currentSize : 100) + 'px');
                expect(vmWrapper.element.style.height).to.equal((currentSize >= 100 ? currentSize : 100) + 'px');
                expect(vmWrapper.element.style.left).to.equal((currentOffset <= 100 ? currentOffset : 100) + 'px');
                expect(vmWrapper.element.style.top).to.equal((currentOffset <= 100 ? currentOffset : 100) + 'px');
            }
            elWrapper.trigger('mouseup');

            vmWrapper.setProps({width: 250, height: 250});
            elWrapper.trigger('mousedown', {
                clientX: fromX + 100, clientY: fromY + 100
            });
            for (let i = 1; i <= 30; i++) {
                elWrapper.trigger('mousemove', {
                    clientX: (fromX + 100) - i * 10, clientY: (fromY + 100) - i * 10
                });
                const currentOffset = i * 10;
                const currentSize = 250 + currentOffset;
                expect(vmWrapper.element.style.width).to.equal((currentSize <= 300 ? currentSize : 300) + 'px');
                expect(vmWrapper.element.style.height).to.equal((currentSize <= 300 ? currentSize : 300) + 'px');
                expect(vmWrapper.element.style.left).to.equal((100 - currentOffset >= 50 ? 100 - currentOffset : 50) + 'px');
                expect(vmWrapper.element.style.top).to.equal((100 - currentOffset >= 50 ? 100 - currentOffset : 50) + 'px');
            }
            elWrapper.trigger('mouseup');

            vmWrapper.setProps({maxWidth: undefined, maxHeight: undefined});
            elWrapper.trigger('mousedown', {
                clientX: fromX + 50, clientY: fromY + 50
            });
            for (let i = 1; i <= 30; i++) {
                elWrapper.trigger('mousemove', {
                    clientX: (fromX + 50) - i * 10, clientY: (fromY + 50) - i * 10
                });
                const currentOffset = i * 10;
                const currentSize = 300 + currentOffset;
                expect(vmWrapper.element.style.width).to.equal((currentSize <= 350 ? currentSize : 350) + 'px');
                expect(vmWrapper.element.style.height).to.equal((currentSize <= 350 ? currentSize : 350) + 'px');
                expect(vmWrapper.element.style.left).to.equal((50 - currentOffset >= 0 ? 50 - currentOffset : 0) + 'px');
                expect(vmWrapper.element.style.top).to.equal((50 - currentOffset >= 0 ? 50 - currentOffset : 0) + 'px');
            }
            elWrapper.trigger('mouseup');

            vmWrapper.setProps({fitParent: false});
            elWrapper.trigger('mousedown', {
                clientX: fromX, clientY: fromY
            });
            for (let i = 1; i <= 10; i++) {
                elWrapper.trigger('mousemove', {
                    clientX: fromX - i * 10, clientY: fromY - i * 10
                });
                const currentOffset = i * 10;
                const currentSize = 350 + currentOffset;
                expect(vmWrapper.element.style.width).to.equal(currentSize + 'px');
                expect(vmWrapper.element.style.height).to.equal(currentSize + 'px');
                expect(vmWrapper.element.style.left).to.equal(-currentOffset + 'px');
                expect(vmWrapper.element.style.top).to.equal(-currentOffset + 'px');
            }
            elWrapper.trigger('mouseup');
        });
    });
});