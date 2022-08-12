/*
 * @Author: yiyang 630999015@qq.com
 * @Date: 2022-07-18 10:49:45
 * @LastEditors: yiyang 630999015@qq.com
 * @LastEditTime: 2022-08-12 10:04:33
 * @FilePath: /WeChatProjects/ComponentLongList/component/RecycleList/RecycleList.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/* 

无限滚动组件的使用方法：
wxml： 在父级组件的wxml里面插入组件，并设置好一个id： <RecycleList id="my_recycle"></RecycleList>
js： 在父组件的 onPageScroll 和 onReachBottom 事件里面分别调用组件内部方法，如：
...
// 页面滚动
  onPageScroll(res) {
    this.throttle(res, this);
  },
  throttle: throttle(function (res, that) {
    // 无限不能动-滚动调用组件函数， my_recycle 为组件id
    let myRecycle = that.selectComponent('#my_recycle');
    myRecycle.getPageScrollTop();
  }, 100, true),

  // 页面触底事件
  onReachBottom(){
    // // 无限不能动-获取组件并触发组件内触底加载函数， my_recycle 为组件id
    let myRecycle = this.selectComponent('#my_recycle');
    myRecycle.getFeeds();
  },
...


注意：
1、一个页面只能使用一个无限滚动组件，否则会有问题。
2、无限滚动内部需要无限展示的元素高度必须一致，所以不支持瀑布流



一行多个：
<RecycleList id="my_recycle" columnNumber="{{2}}"></RecycleList>

自定义无限滚动id：
<RecycleList id="my_recycle" recycleListContentId="id1"></RecycleList>
*/
Component({
    options: {
      multipleSlots: true, // 在组件定义时的选项中启用多slot支持
      pureDataPattern: /^_/, // 指定所有 _ 开头的数据字段为纯数据字段
    },
    externalClasses: ['recycle-box-class', 'recycle-list-class', 'recycle-item-class'],  // 将父级的样式传给子组件使用
    properties: {
        columnNumber: { // 一行显示几个
            type: Number,
            value: 1
        },
        recycleListContentId: { // 无限列表id
            type: String,
            value: 'recycleList-content'
        },
        temp: null
    },
    lifetimes: {
        // 组件初始化生命周期-组件初始化完成
        attached: function() {
            const self = this;
            // 获取可视区域高度
            wx.getSystemInfo({
                success: (res) => {
                self.data._showHeight = res.windowHeight;
                // console.log(res.windowHeight)
                },
                fail: ()=>{}
            });
        
            // 获取数据
            this.getFeeds();
        }
    },
    data: {
        hasMore: true,
        listData: [],   // 将数据处理成二维数组
        scrollPageNumber:0,   // 可视区域的页码
        turnPageHeight: 0, // 无限翻页，每页的高度
        hasLoading: false,   // 是否正在获取数据

        // testBeforeHeight: 1000,  // 用于测试，无限滚动前面的元素高度

        // 以下为纯数据字段
        _bakScrollPageNumber: 0,   // 上一次的页码，主要是用来对比页码是否改变更换数据
        _height: 0,   // 第一个子模块的高度
        _bakListData: [],  // 数据备份
        _currentPageNumber:0,  // 最后一次请求接口的页码
        _showHeight: 0, // 可视区域高度
        _diffHeight: 0,  // 无限滚动列表内部，第一个元素前面距离滚动列表顶部距离
        _apiData: { "q": "衣服", "hasActivity": "", "minPrice": 0, "maxPrice": 0, "l3CategoryIds": [], "sortType": "DEFAULT", "sortAsc": false, "provinceId": "", "cityId": "", "regionId": "", "page": { "limit": 20, "offset": 0 }, "retAuctionProduct": true },
    },
  
    /**
     * 组件的方法列表
     */
    methods: {
        // 获取圈子数据方法
        async getFeeds() {
            wx.getStorageSync('debug') && console.log('component----', '加载数据-start')
            // 如果没有更多，则直接返回
            // 判断如果正在加载，则进行节流处理，不请求下一次的接口请求
            if (!this.data.hasMore || this.data.hasLoading) {
                return;
            }
            wx.getStorageSync('debug') && console.log('component----', '加载数据-ing', this.data._apiData.page.offset,this.data._apiData.page.limit)
            // console.log('this.data._apiData', this.data._apiData)
            let curentP = this.data._apiData.page.offset/this.data._apiData.page.limit;
            // 请求接口前设置loading状态
            // this.data.hasLoading = true;
            this.setData({
                hasLoading: true,
            });

            // 使用promise模拟接口请求
            await new Promise((res, rej) => {
                setTimeout(()=>{
                    // this.data.hasLoading=false;
                    this.setData({
                        hasLoading: false,
                    });
                    res();
                }, 200)
            });
            wx.getStorageSync('debug') && console.log('component----', '加载数据-end')
            
            // 请求接口
            let resp = {};

            // 模拟数据处理-start
            let testList = [];
            for(var i=0;i < this.data._apiData.page.limit;i++){
                testList.push({
                    entity: {

                    }
                })
            }
            resp = {
                error_num: 0,
                content: {
                    result1: testList,
                }
            }
            // 模拟数据处理-end

            let { content } = resp;
            if (resp.error_num === 0 && content) {
                let list = content.result1;

                // 当前页数
                this.data._currentPageNumber = curentP;

                // 数据处理，给每条数据标识上页码
                list.forEach((item)=>{
                    item.entity.pageNumber = this.data._currentPageNumber;
                })

                // 将数据存储起来
                this.data._bakListData[this.data._currentPageNumber] = list;
                // }

                // 更新请求页码
                this.data._apiData.page.offset += this.data._apiData.page.limit;

                
                this.setData({
                    hasMore: true,
                });

                // 根据不能动页码获取需要显示的数据
                this.getShowData();
            } else {
                this.setData({
                    hasMore: false,
                });
            }
        },
        // 更具滚动页码获取需要显示数据
        getShowData(){
            let listData = []
            // 根据页码获取当前页码前后1页的数据
            listData.length = this.data._bakListData.length;

            if(this.data.scrollPageNumber>=1){
                listData[this.data.scrollPageNumber-1] = this.data._bakListData[this.data.scrollPageNumber-1];
            }
            if(this.data._bakListData[this.data.scrollPageNumber]){
                listData[this.data.scrollPageNumber] = this.data._bakListData[this.data.scrollPageNumber];
            }

            if(this.data._bakListData[this.data.scrollPageNumber+1]){
                listData[this.data.scrollPageNumber+1] = this.data._bakListData[this.data.scrollPageNumber+1];
            }

            // 将最近的3页数据显示出来
            this.setData({
                listData: listData,
                // 计算对应某一页的高度
                turnPageHeight: this.data._height ? this.data._height * (this.data._apiData.page.limit/ this.data.columnNumber) : 0,
            }, ()=>{
                // 当未获取到高度的时候采取获取，如果已经获取到了就不需要再去获取高度了
                !this.data._height && this.getItemHeight();
            }, 100)
        },

        getItemHeight(){
            let self = this;
            var query = this.createSelectorQuery();

            query.select('.recycleList-item').boundingClientRect(function (res2) {
                self.data._height = res2.height;
            }).exec();

        },

        getPageScrollTop(){
            let self = this;

            var query = this.createSelectorQuery()
            query.select(`#${this.data.recycleListContentId}`).boundingClientRect(function (res) {
                // console.log('self.data._diffHeight', self.data._diffHeight, self.data._showHeight, res.top)
                // 根据页面显示区域的底部位置计算当前是多少页
                let scrollP = Math.floor(Math.abs(res.top-self.data._showHeight+self.data._diffHeight)/self.data._height/(self.data._apiData.page.limit/self.data.columnNumber));

                // 判断上一次的备份页码和现在计算出来的页码是否相同，如果相同就不做处理（目的优化性能）
                if(self.data._bakScrollPageNumber === scrollP){
                    return;
                }

                // 获取当前的scroll页码，这和接口请求的当前页面不一样
                // 根据滚动位置和单个模块高度以及每页多少个来计算当前是第几页
                self.data._bakScrollPageNumber = scrollP;

                self.setData({
                    scrollPageNumber : scrollP,
                }, ()=>{
                    // 获取显示的页码数据
                    self.getShowData();
                    // console.log(self.data.scrollPageNumber)
                })
            }).exec();
        },

        // 无限滚动列表内部，所有滚动元素前面的元素高度有变化后需要调用下修正差值，也就是在 #recycleList-content 内部，第一个 recycleList-item 前面的元素
        getScrollAfterHeight(){
            let self = this;
            var query = this.createSelectorQuery()
            query.select(`#${this.data.recycleListContentId}-before`).boundingClientRect(function (res) {
                self.data._diffHeight = res.height;
                // console.log()
            }).exec();
        },

        beforeChangeHeight(){
            // this.setData({
            //     testBeforeHeight: this.data.testBeforeHeight + 100,
            // }, ()=>{
            //     // this.getScrollAfterHeight();
            // });
        },
    }
  });
  
  