import Slider from "react-slick"

export function PauseOnHover() {
  const settings = {
    dots: true,
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    arrows: false,
    speed: 600,
    cssEase: "ease-in-out",
    rtl: true 
  }

  const images = [
    "https://zolstock.co.il/wp-content/uploads/2025/10/21344534534.jpg",
    "https://zolstock.co.il/wp-content/uploads/2025/10/45-1.jpg",
    "https://zolstock.co.il/wp-content/uploads/2025/10/5656.jpg",
    "https://zolstock.co.il/wp-content/uploads/2025/10/45.jpg",
  ];

  return (
    <div className="slider-container">
      <Slider {...settings}>
        {images.map((src, idx) => (
          <div key={idx} className="slide">
            <img src={src} alt={`slide-${idx}`} />
          </div>
        ))}
      </Slider>
    </div>
  )
}
