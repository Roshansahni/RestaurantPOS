# API Reference

Generated from the FastAPI routes. Interactive docs: http://localhost:8000/docs

| Method | Path | Allowed roles | Handler |
|---|---|---|---|
| POST | `/api/auth/login` | public | login |
| GET | `/api/auth/me` | any signed-in user | me |
| GET | `/api/products` | any signed-in user | products |
| POST | `/api/products` | admin, manager | add_product |
| PUT | `/api/products/{pid}` | admin, manager | edit_product |
| DELETE | `/api/products/{pid}` | admin, manager | del_product |
| POST | `/api/orders` | admin, manager, cashier | create_order |
| GET | `/api/orders` | any signed-in user | list_orders |
| PATCH | `/api/orders/{oid}/status` | any signed-in user | set_status |
| POST | `/api/orders/{oid}/pay` | admin, manager, cashier | pay |
| GET | `/api/reports/summary` | admin, manager | summary |
| GET | `/api/tables` | any signed-in user | tables |
| GET | `/api/categories` | any signed-in user | categories |
| GET | `/api/customers` | admin, manager, cashier | customers |
| POST | `/api/customers` | admin, manager, cashier | add_customer |
| GET | `/api/customers/{cid}/orders` | admin, manager, cashier | customer_orders |
| GET | `/api/employees` | admin, manager | employees |
| POST | `/api/employees` | admin, manager | add_employee |
| POST | `/api/employees/{eid}/attendance` | admin, manager | mark_attendance |
| POST | `/api/suppliers` | admin, manager | add_supplier |
| GET | `/api/inventory` | admin, manager | inventory |
| POST | `/api/inventory` | admin, manager | add_item |
| POST | `/api/inventory/{iid}/stock` | admin, manager | stock |
| GET | `/api/reports/dashboard` | admin, manager | dashboard |
| GET | `/api/reports/sales.csv` | admin, manager | sales_csv |
| GET | `/api/reports/sales.pdf` | admin, manager | sales_pdf |
| GET | `/api/settings` | any signed-in user | read_settings |
| PUT | `/api/settings` | admin | write_settings |
| POST | `/api/tables` | admin, manager | add_table |
| PUT | `/api/tables/{tid}` | admin, manager | edit_table |
| DELETE | `/api/tables/{tid}` | admin, manager | del_table |
| DELETE | `/api/suppliers/{sid}` | admin, manager | del_supplier |
| GET | `/api/suppliers` | admin, manager | suppliers |
| GET | `/api/users` | admin | users |
| POST | `/api/users` | admin | add_user |
| PATCH | `/api/users/{uid}` | admin | patch_user |
| POST | `/api/auth/password` | any signed-in user | change_password |
| GET | `/api/recipes/{pid}` | admin, manager | get_recipe |
| PUT | `/api/recipes/{pid}` | admin, manager | set_recipe |
| POST | `/api/expenses` | admin, manager | add_expense |
| GET | `/api/expenses` | admin, manager | list_expenses |
| GET | `/api/reservations` | admin, manager, cashier | list_res |
| POST | `/api/reservations` | admin, manager, cashier | add_res |
| PATCH | `/api/reservations/{rid}` | admin, manager, cashier | set_res |
| GET | `/api/reports/sales` | admin, manager | sales |
| GET | `/api/reports/payments` | admin, manager | payments |
| GET | `/api/reports/inventory` | admin, manager | inv_report |
| GET | `/api/reports/profit` | admin, manager | profit |
| PATCH | `/api/orders/{oid}/priority` | admin, manager, cashier | set_priority |
| PUT | `/api/expenses/{eid}` | admin, manager | edit_expense |
| DELETE | `/api/expenses/{eid}` | admin, manager | del_expense |
| PUT | `/api/employees/{eid}` | admin, manager | edit_employee |
| DELETE | `/api/employees/{eid}` | admin, manager | del_employee |
| GET | `/api/reports/export` | admin, manager | export |
| POST | `/api/auth/refresh` | public | refresh |
| POST | `/api/auth/logout` | public | logout |
| GET | `/api/audit` | admin | audit_log |
| POST | `/api/products/{pid}/image` | admin, manager | upload_image |

## WebSocket
`/ws/kitchen` – after connecting, the client sends its JWT as the first text message (within 10 s). The server replies `{"type":"ready"}`, then pushes `{"type":"orders_changed"}` after any order is created, paid or changes status; clients then reload `/api/orders`. Invalid or missing token closes the socket with code 4401.
