import { redirect } from "next/navigation";

// старая страница заказов — теперь заказы во вкладке личного кабинета
export default function OrdersPage() {
  redirect("/account?tab=orders");
}
