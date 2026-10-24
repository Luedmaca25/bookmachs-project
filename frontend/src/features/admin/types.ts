export interface AdminDashboardStats {
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  newUsersInPeriod: number;
  exchangeFeeSales: number;
  swipePackSales: number;
  premiumUpgradeSales: number;
  totalSales: number;
  totalOrdersCount: number;
  completedOrdersCount: number;
  pendingOrdersCount: number;
  startDate: string;
  endDate: string;
  salesByDay: {
    date: string;
    feeSales: number;
    subscriptionSales: number;
    packSales: number;
    totalSales: number;
    orderCount: number;
  }[];
}

export interface AdminOrderUser {
  id: string;
  name: string;
  email: string;
  telefono: string;
  documentoIdentidad: string;
  pais: string;
  isPremium: boolean;
}

export interface AdminOrderBook {
  id: string;
  title: string;
  author: string;
  condition: string;
  imageUrl: string;
  isInternalStock: boolean;
}

export interface AdminOrderReview {
  rating?: number | null;
  comment?: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  buyOrder: string;
  createdAt: string;
  statusUpdatedAt: string;
  feeAmount: number;
  paymentStatus: string;
  logisticsStatus: string;
  logisticsMethod: string;
  shippingAddress: string;
  shippingCity: string;
  shippingRegion: string;
  trackingNumber?: string | null;
  courierName?: string | null;
  adminNotes?: string | null;
  postSaleStatus: string;
  postSaleNotes?: string | null;
  requester: AdminOrderUser;
  owner?: AdminOrderUser | null;
  requestedBook: AdminOrderBook;
  offeredBook?: AdminOrderBook | null;
  review?: AdminOrderReview | null;
}
