import type { Component } from 'vue'
import HomeFilled from '~icons/ep/home-filled'
import Setting from '~icons/ep/setting'
import User from '~icons/ep/user'
import Avatar from '~icons/ep/avatar'
import Document from '~icons/ep/document'
import Grid from '~icons/ep/grid'
import Edit from '~icons/ep/edit'
import Fold from '~icons/ep/fold'
import Expand from '~icons/ep/expand'
import ArrowDown from '~icons/ep/arrow-down'
import Close from '~icons/ep/close'
import SwitchButton from '~icons/ep/switch-button'
import Search from '~icons/ep/search'
import Refresh from '~icons/ep/refresh'
import Plus from '~icons/ep/plus'
import Delete from '~icons/ep/delete'
import Upload from '~icons/ep/upload'
import Download from '~icons/ep/download'
import Warning from '~icons/ep/warning'
import InfoFilled from '~icons/ep/info-filled'
import SuccessFilled from '~icons/ep/success-filled'
import CircleCloseFilled from '~icons/ep/circle-close-filled'
import List from '~icons/ep/list'
import Menu from '~icons/ep/menu'
import Link from '~icons/ep/link'
import View from '~icons/ep/view'
import Hide from '~icons/ep/hide'
import Key from '~icons/ep/key'
import Lock from '~icons/ep/lock'
import Unlock from '~icons/ep/unlock'
import Phone from '~icons/ep/phone'
import Message from '~icons/ep/message'
import Star from '~icons/ep/star'
import StarFilled from '~icons/ep/star-filled'
import Clock from '~icons/ep/clock'
import Tools from '~icons/ep/tools'
import Monitor from '~icons/ep/monitor'
import CaretTop from '~icons/ep/caret-top'
import CaretBottom from '~icons/ep/caret-bottom'
import DArrowLeft from '~icons/ep/d-arrow-left'
import DArrowRight from '~icons/ep/d-arrow-right'
import ArrowLeft from '~icons/ep/arrow-left'
import TrendCharts from '~icons/ep/trend-charts'
import Coin from '~icons/ep/coin'
import ShoppingCartFull from '~icons/ep/shopping-cart-full'
import UserFilled from '~icons/ep/user-filled'
import OfficeBuilding from '~icons/ep/office-building'
import Management from '~icons/ep/management'
import Flag from '~icons/ep/flag'
import School from '~icons/ep/school'
import DataAnalysis from '~icons/ep/data-analysis'
import DataBoard from '~icons/ep/data-board'
import DataLine from '~icons/ep/data-line'
import PieChart from '~icons/ep/pie-chart'
import Histogram from '~icons/ep/histogram'
import Folder from '~icons/ep/folder'
import FolderOpened from '~icons/ep/folder-opened'
import FolderAdd from '~icons/ep/folder-add'
import FolderChecked from '~icons/ep/folder-checked'
import Files from '~icons/ep/files'
import DocumentAdd from '~icons/ep/document-add'
import DocumentChecked from '~icons/ep/document-checked'
import CopyDocument from '~icons/ep/copy-document'
import Memo from '~icons/ep/memo'
import Notebook from '~icons/ep/notebook'
import Collection from '~icons/ep/collection'
import CollectionTag from '~icons/ep/collection-tag'
import Paperclip from '~icons/ep/paperclip'
import Bell from '~icons/ep/bell'
import BellFilled from '~icons/ep/bell-filled'
import Notification from '~icons/ep/notification'
import MessageBox from '~icons/ep/message-box'
import ChatDotRound from '~icons/ep/chat-dot-round'
import ChatRound from '~icons/ep/chat-round'
import Briefcase from '~icons/ep/briefcase'
import Money from '~icons/ep/money'
import CreditCard from '~icons/ep/credit-card'
import Wallet from '~icons/ep/wallet'
import WalletFilled from '~icons/ep/wallet-filled'
import PriceTag from '~icons/ep/price-tag'
import Goods from '~icons/ep/goods'
import Shop from '~icons/ep/shop'
import ShoppingBag from '~icons/ep/shopping-bag'
import Ticket from '~icons/ep/ticket'
import Tickets from '~icons/ep/tickets'
import Present from '~icons/ep/present'
import Calendar from '~icons/ep/calendar'
import AlarmClock from '~icons/ep/alarm-clock'
import Stopwatch from '~icons/ep/stopwatch'
import Timer from '~icons/ep/timer'
import Location from '~icons/ep/location'
import LocationFilled from '~icons/ep/location-filled'
import MapLocation from '~icons/ep/map-location'
import Position from '~icons/ep/position'
import Compass from '~icons/ep/compass'
import House from '~icons/ep/house'
import SetUp from '~icons/ep/set-up'
import Operation from '~icons/ep/operation'
import Switch from '~icons/ep/switch'
import TurnOff from '~icons/ep/turn-off'
import FullScreen from '~icons/ep/full-screen'
import Guide from '~icons/ep/guide'
import Help from '~icons/ep/help'
import HelpFilled from '~icons/ep/help-filled'
import Filter from '~icons/ep/filter'
import Sort from '~icons/ep/sort'
import Rank from '~icons/ep/rank'
import Select from '~icons/ep/select'
import MagicStick from '~icons/ep/magic-stick'
import ZoomIn from '~icons/ep/zoom-in'
import ZoomOut from '~icons/ep/zoom-out'
import Printer from '~icons/ep/printer'
import Camera from '~icons/ep/camera'
import Picture from '~icons/ep/picture'
import PictureFilled from '~icons/ep/picture-filled'
import Film from '~icons/ep/film'
import VideoCamera from '~icons/ep/video-camera'
import Microphone from '~icons/ep/microphone'
import Headset from '~icons/ep/headset'
import Cellphone from '~icons/ep/cellphone'
import Iphone from '~icons/ep/iphone'
import Cpu from '~icons/ep/cpu'
import Trophy from '~icons/ep/trophy'
import Medal from '~icons/ep/medal'
import Stamp from '~icons/ep/stamp'
import Suitcase from '~icons/ep/suitcase'
import Box from '~icons/ep/box'

const epMap: Record<string, Component> = {
  'ep:home-filled': HomeFilled,
  'ep:setting': Setting,
  'ep:user': User,
  'ep:avatar': Avatar,
  'ep:document': Document,
  'ep:grid': Grid,
  'ep:edit': Edit,
  'ep:fold': Fold,
  'ep:expand': Expand,
  'ep:arrow-down': ArrowDown,
  'ep:close': Close,
  'ep:switch-button': SwitchButton,
  'ep:search': Search,
  'ep:refresh': Refresh,
  'ep:plus': Plus,
  'ep:delete': Delete,
  'ep:upload': Upload,
  'ep:download': Download,
  'ep:warning': Warning,
  'ep:info-filled': InfoFilled,
  'ep:success-filled': SuccessFilled,
  'ep:circle-close-filled': CircleCloseFilled,
  'ep:list': List,
  'ep:menu': Menu,
  'ep:link': Link,
  'ep:view': View,
  'ep:hide': Hide,
  'ep:key': Key,
  'ep:lock': Lock,
  'ep:unlock': Unlock,
  'ep:phone': Phone,
  'ep:message': Message,
  'ep:star': Star,
  'ep:star-filled': StarFilled,
  'ep:clock': Clock,
  'ep:tools': Tools,
  'ep:monitor': Monitor,
  'ep:caret-top': CaretTop,
  'ep:caret-bottom': CaretBottom,
  'ep:d-arrow-left': DArrowLeft,
  'ep:d-arrow-right': DArrowRight,
  'ep:arrow-left': ArrowLeft,
  'ep:trend-charts': TrendCharts,
  'ep:coin': Coin,
  'ep:shopping-cart-full': ShoppingCartFull,
  // 用户与组织
  'ep:user-filled': UserFilled,
  'ep:office-building': OfficeBuilding,
  'ep:management': Management,
  'ep:flag': Flag,
  'ep:school': School,
  // 数据与图表
  'ep:data-analysis': DataAnalysis,
  'ep:data-board': DataBoard,
  'ep:data-line': DataLine,
  'ep:pie-chart': PieChart,
  'ep:histogram': Histogram,
  // 文件与文档
  'ep:folder': Folder,
  'ep:folder-opened': FolderOpened,
  'ep:folder-add': FolderAdd,
  'ep:folder-checked': FolderChecked,
  'ep:files': Files,
  'ep:document-add': DocumentAdd,
  'ep:document-checked': DocumentChecked,
  'ep:copy-document': CopyDocument,
  'ep:memo': Memo,
  'ep:notebook': Notebook,
  'ep:collection': Collection,
  'ep:collection-tag': CollectionTag,
  'ep:paperclip': Paperclip,
  // 消息与通知
  'ep:bell': Bell,
  'ep:bell-filled': BellFilled,
  'ep:notification': Notification,
  'ep:message-box': MessageBox,
  'ep:chat-dot-round': ChatDotRound,
  'ep:chat-round': ChatRound,
  // 财务与商务
  'ep:briefcase': Briefcase,
  'ep:money': Money,
  'ep:credit-card': CreditCard,
  'ep:wallet': Wallet,
  'ep:wallet-filled': WalletFilled,
  'ep:price-tag': PriceTag,
  'ep:goods': Goods,
  'ep:shop': Shop,
  'ep:shopping-bag': ShoppingBag,
  'ep:ticket': Ticket,
  'ep:tickets': Tickets,
  'ep:present': Present,
  // 时间与日程
  'ep:calendar': Calendar,
  'ep:alarm-clock': AlarmClock,
  'ep:stopwatch': Stopwatch,
  'ep:timer': Timer,
  // 位置与导航
  'ep:location': Location,
  'ep:location-filled': LocationFilled,
  'ep:map-location': MapLocation,
  'ep:position': Position,
  'ep:compass': Compass,
  'ep:house': House,
  // 系统与工具
  'ep:set-up': SetUp,
  'ep:operation': Operation,
  'ep:switch': Switch,
  'ep:turn-off': TurnOff,
  'ep:full-screen': FullScreen,
  'ep:guide': Guide,
  'ep:help': Help,
  'ep:help-filled': HelpFilled,
  'ep:filter': Filter,
  'ep:sort': Sort,
  'ep:rank': Rank,
  'ep:select': Select,
  'ep:magic-stick': MagicStick,
  'ep:zoom-in': ZoomIn,
  'ep:zoom-out': ZoomOut,
  'ep:printer': Printer,
  // 媒体与设备
  'ep:camera': Camera,
  'ep:picture': Picture,
  'ep:picture-filled': PictureFilled,
  'ep:film': Film,
  'ep:video-camera': VideoCamera,
  'ep:microphone': Microphone,
  'ep:headset': Headset,
  'ep:cellphone': Cellphone,
  'ep:iphone': Iphone,
  'ep:cpu': Cpu,
  // 成就与荣誉
  'ep:trophy': Trophy,
  'ep:medal': Medal,
  'ep:stamp': Stamp,
  'ep:suitcase': Suitcase,
  'ep:box': Box,
}

export default epMap
