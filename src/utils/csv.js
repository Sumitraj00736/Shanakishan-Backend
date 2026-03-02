function escapeCsv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function rowFromColumns(record, columns) {
  return columns.map((column) => escapeCsv(record[column])).join(",");
}

function toCSV(rows, columns) {
  if (!rows?.length) return "";
  const selectedColumns = columns?.length ? columns : Object.keys(rows[0]);
  const header = selectedColumns.join(",");
  const body = rows.map((row) => rowFromColumns(row, selectedColumns));
  return [header, ...body].join("\n");
}

function amountOf(booking) {
  return Number(booking.totalRent || booking.totalAmount || booking.payment?.amount || 0);
}

function buildBookingsCsv(bookings) {
  const columns = [
    "bookingId",
    "createdAt",
    "status",
    "productId",
    "memberId",
    "userName",
    "userPhone",
    "userEmail",
    "quantity",
    "startDateTime",
    "endDateTime",
    "totalRent",
    "paymentMethod",
    "paymentAmount",
    "verifiedBy",
    "verifiedAt",
    "adminNotes",
  ];

  const normalized = bookings.map((booking) => ({
    bookingId: booking._id,
    createdAt: booking.createdAt ? new Date(booking.createdAt).toISOString() : "",
    status: booking.status || "",
    productId: booking.productId || "",
    memberId: booking.memberId || "",
    userName: booking.userName || "",
    userPhone: booking.userPhone || "",
    userEmail: booking.userEmail || "",
    quantity: booking.quantity || 0,
    startDateTime: booking.startDateTime ? new Date(booking.startDateTime).toISOString() : "",
    endDateTime: booking.endDateTime ? new Date(booking.endDateTime).toISOString() : "",
    totalRent: amountOf(booking),
    paymentMethod: booking.payment?.method || "",
    paymentAmount: Number(booking.payment?.amount || 0),
    verifiedBy: booking.payment?.verifiedBy || "",
    verifiedAt: booking.payment?.verifiedAt ? new Date(booking.payment.verifiedAt).toISOString() : "",
    adminNotes: booking.adminNotes || "",
  }));

  const csvRows = toCSV(normalized, columns);

  const summary = normalized.reduce(
    (acc, booking) => {
      acc.totalBookings += 1;
      if (booking.status === "cancelled") acc.cancelledBookings += 1;
      if (booking.status === "confirmed" || booking.status === "completed") {
        acc.confirmedBookings += 1;
        acc.totalSales += Number(booking.totalRent || 0);
      }
      return acc;
    },
    { totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, totalSales: 0 }
  );

  const summaryRows = [
    "",
    "summary_key,summary_value",
    `total_bookings,${summary.totalBookings}`,
    `confirmed_bookings,${summary.confirmedBookings}`,
    `cancelled_bookings,${summary.cancelledBookings}`,
    `total_sales,${summary.totalSales}`,
  ].join("\n");

  return `${csvRows}\n${summaryRows}`;
}

module.exports = {
  toCSV,
  buildBookingsCsv,
};
