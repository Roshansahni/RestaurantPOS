from decimal import Decimal, ROUND_HALF_UP

Q = Decimal("0.01")
def r(x): return Decimal(x).quantize(Q, rounding=ROUND_HALF_UP)

def compute(lines, discount=Decimal("0"), interstate=False):
    """lines: [(unit_price, qty, gst_rate)]. GST-exclusive prices.
    Discount is spread pro-rata so tax is charged on the discounted value."""
    lines = [(Decimal(p), int(q), Decimal(g)) for p, q, g in lines]
    subtotal = r(sum(p * q for p, q, _ in lines))
    discount = r(discount)
    if discount < 0 or discount > subtotal:
        raise ValueError("Invalid discount")
    cgst = sgst = igst = Decimal("0")
    for p, q, g in lines:
        line = p * q
        share = discount * line / subtotal if subtotal else Decimal("0")
        tax = r((line - share) * g / 100)
        if interstate:
            igst += tax
        else:
            half = r(tax / 2)
            cgst += half
            sgst += tax - half
    total = r(subtotal - discount + cgst + sgst + igst)
    return dict(subtotal=subtotal, discount=discount, cgst=r(cgst), sgst=r(sgst), igst=r(igst), total=total)
